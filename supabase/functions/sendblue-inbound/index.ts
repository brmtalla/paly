import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';
import { sendSms } from '../_shared/sms.ts';
import { classifyInbound, normalizePhoneNumber } from '../_shared/smsCommands.ts';
import { isPro } from '../_shared/entitlement.ts';
import { answerStudyQuestion } from '../_shared/tutor.ts';

/**
 * Inbound SMS/iMessage from SendBlue.
 *
 * Three jobs:
 *   1. Link a handset to an account. The student texts their per-account code
 *      (the app pre-fills it), which is the only way profiles.phone_number ever
 *      gets written. Sending from the handset proves they own it.
 *   2. Honour STOP / START / HELP. Carriers require these to work on every
 *      message, and A2P 10DLC registration is refused without them.
 *   3. Answer questions. Anything that is not a keyword or a link code is a
 *      student asking about material Paly has already sent them — a Pro
 *      feature, answered from their own chunks.
 *
 * Configure in SendBlue: Dashboard → Settings → Webhooks → Inbound
 *   URL: https://<project-ref>.supabase.co/functions/v1/sendblue-inbound?token=<SENDBLUE_INBOUND_SECRET>
 *
 * Deploy with --no-verify-jwt: SendBlue authenticates with the token above, not
 * a Supabase JWT.
 */
const INBOUND_SECRET = Deno.env.get('SENDBLUE_INBOUND_SECRET');

/** Length-independent comparison so the secret cannot be probed by timing. */
function secretMatches(provided: string | null): boolean {
  if (!INBOUND_SECRET || !provided) return false;
  if (provided.length !== INBOUND_SECRET.length) return false;

  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ INBOUND_SECRET.charCodeAt(i);
  }

  return diff === 0;
}

const HELP_TEXT =
  'Paly sends your daily study chunks by text, and answers questions about them. ' +
  'Open the Paly app and tap Activate texts to get your link code. ' +
  'Reply STOP to opt out. Msg & data rates may apply.';

/**
 * Answering costs a model call, so it is a Pro feature — and the upsell is the
 * most honest place to make that case, since they just tried to use it.
 */
const UPGRADE_TEXT =
  'Asking me about your material is a Paly Pro feature. ' +
  'Open the app and tap Subscription to turn it on — then text me anything about a chunk and I will answer from your own notes.';

/**
 * Runs the answer without holding the webhook open. SendBlue retries on a slow
 * response, which would answer the same question twice.
 */
function runInBackground(work: Promise<unknown>): void {
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } })
    .EdgeRuntime;

  if (runtime?.waitUntil) {
    runtime.waitUntil(work.catch((error) => console.error('Background reply failed:', error)));
    return;
  }

  // Local `supabase functions serve` has no waitUntil; the reply still needs to
  // go out, so fall back to a floating promise rather than dropping it.
  work.catch((error) => console.error('Background reply failed:', error));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!INBOUND_SECRET) {
    console.error('SENDBLUE_INBOUND_SECRET is not configured');
    return json({ error: 'Webhook not configured' }, 503);
  }

  const url = new URL(req.url);
  const provided = url.searchParams.get('token') ?? req.headers.get('Authorization');

  if (!secretMatches(provided)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await req.json();

    // SendBlue posts our own outbound messages back too; ignore the echo.
    if (payload?.is_outbound === true) {
      return json({ success: true, ignored: 'outbound' });
    }

    const rawFrom: string | undefined = payload?.from_number ?? payload?.number;
    const content: string = payload?.content ?? '';

    if (!rawFrom) {
      return json({ error: 'Missing from_number' }, 400);
    }

    const phone = normalizePhoneNumber(rawFrom);

    if (!phone) {
      // Not a number we could ever text back, so there is nothing to reply to.
      console.warn('Unparseable inbound number');
      return json({ success: true, ignored: 'unparseable number' });
    }

    const command = classifyInbound(content);

    switch (command.kind) {
      case 'stop':
        return await handleStop(phone);
      case 'start':
        return await handleStart(phone);
      case 'link':
        return await handleLink(phone, command.code!);
      case 'help':
        await sendSms(phone, HELP_TEXT);
        return json({ success: true, action: 'help' });
      case 'unknown':
      default:
        return await handleQuestion(phone, content);
    }
  } catch (error) {
    console.error('Inbound webhook error:', error);
    // 200 keeps SendBlue from retrying a message we already failed to parse.
    return json({ success: false, error: 'Internal error' });
  }
});

/**
 * Opting out is unconditional: it must succeed even for a number we have never
 * seen, and the confirmation is the last message we are allowed to send.
 */
async function handleStop(phone: string): Promise<Response> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .update({ sms_opted_in: false, updated_at: new Date().toISOString() })
    .eq('phone_number', phone)
    .select('id');

  // The same handset may also be on the landing-page list, which has its own
  // consent flag. One STOP has to silence every list we hold them on.
  await supabaseAdmin
    .from('landing_subscribers')
    .update({ sms_opt_in: false, updated_at: new Date().toISOString() })
    .eq('phone_number', phone);

  await sendSms(
    phone,
    "You're unsubscribed from Paly texts and won't receive any more. " +
      'Your study chunks are still in the app. Reply START to turn texts back on.'
  );

  return json({ success: true, action: 'stop', matched: data?.length ?? 0 });
}

async function handleStart(phone: string): Promise<Response> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .update({ sms_opted_in: true, updated_at: new Date().toISOString() })
    .eq('phone_number', phone)
    .select('id');

  if (!data || data.length === 0) {
    await sendSms(phone, HELP_TEXT);
    return json({ success: true, action: 'start', matched: 0 });
  }

  await sendSms(phone, "You're back on. Your next study chunk will arrive here.");
  return json({ success: true, action: 'start', matched: 1 });
}

async function handleLink(phone: string, code: string): Promise<Response> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, assistant_name')
    .eq('sms_link_code', code)
    .maybeSingle();

  if (!profile) {
    await sendSms(
      phone,
      `That code didn't match an account. Open Paly and tap Activate texts to see yours. ` +
        'Reply STOP to opt out.'
    );
    return json({ success: true, action: 'link', matched: false });
  }

  // The handset may already be linked to a different account (a shared phone, or
  // a student who made a new account). The number can only belong to one, and
  // the most recent proof of ownership wins.
  await supabaseAdmin
    .from('profiles')
    .update({ phone_number: null, sms_opted_in: false, updated_at: new Date().toISOString() })
    .eq('phone_number', phone)
    .neq('id', profile.id);

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      phone_number: phone,
      sms_opted_in: true,
      sms_linked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Link failed:', error);
    await sendSms(phone, 'Something went wrong linking your number. Please try again shortly.');
    return json({ success: false, action: 'link' }, 500);
  }

  const assistant = profile.assistant_name || 'Paly';

  await sendSms(
    phone,
    `${assistant} here! Your number is linked — your daily study chunks will arrive in this thread. ` +
      'Reply to any of them with a question and I will answer from your own material. ' +
      'Reply STOP to opt out at any time. Msg & data rates may apply.'
  );

  return json({ success: true, action: 'link', matched: true });
}

/**
 * Free text from a linked handset is a question about their material.
 *
 * The answer takes a few seconds, so the webhook is acknowledged first and the
 * reply is sent from the background — SendBlue retries anything slow, and a
 * retry here would answer the same question twice.
 */
async function handleQuestion(phone: string, question: string): Promise<Response> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, assistant_name, sms_opted_in')
    .eq('phone_number', phone)
    .maybeSingle();

  // Unlinked, or opted out — in both cases the only thing we may send is the
  // help text, which is also the useful answer for someone who is lost.
  if (!profile || !profile.sms_opted_in) {
    await sendSms(phone, HELP_TEXT);
    return json({ success: true, action: 'help', reason: profile ? 'opted_out' : 'unlinked' });
  }

  if (!(await isPro(profile.id))) {
    await sendSms(phone, UPGRADE_TEXT);
    return json({ success: true, action: 'question', result: 'upsell' });
  }

  runInBackground(replyToQuestion(phone, profile, question));

  return json({ success: true, action: 'question', result: 'queued' });
}

async function replyToQuestion(
  phone: string,
  profile: { id: string; assistant_name?: string | null },
  question: string
): Promise<void> {
  const result = await answerStudyQuestion(profile, question);

  if (result.ok) {
    await sendSms(phone, result.answer);
    return;
  }

  const fallbacks: Record<typeof result.reason, string> = {
    no_material:
      "I haven't sent you any study material yet — upload a lecture in the app and I'll start texting you chunks you can ask me about.",
    rate_limited:
      "That's a lot of questions for one day. Ask me again tomorrow, or open the app — everything I've sent you is in there.",
    too_long: 'That one is too long to answer by text. Try asking it in a sentence or two.',
    failed: "I couldn't get to that one. Try asking again in a moment.",
  };

  await sendSms(phone, fallbacks[result.reason]);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
