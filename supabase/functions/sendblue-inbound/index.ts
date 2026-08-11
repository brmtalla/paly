import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';
import { sendSms } from '../_shared/sms.ts';
import { classifyInbound, normalizePhoneNumber } from '../_shared/smsCommands.ts';

/**
 * Inbound SMS/iMessage from SendBlue.
 *
 * Two jobs:
 *   1. Link a handset to an account. The student texts their per-account code
 *      (the app pre-fills it), which is the only way profiles.phone_number ever
 *      gets written. Sending from the handset proves they own it.
 *   2. Honour STOP / START / HELP. Carriers require these to work on every
 *      message, and A2P 10DLC registration is refused without them.
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
  'Paly sends your daily study chunks by text. ' +
  'Open the Paly app and tap Activate texts to get your link code. ' +
  'Reply STOP to opt out. Msg & data rates may apply.';

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
      case 'unknown':
      default:
        await sendSms(phone, HELP_TEXT);
        return json({ success: true, action: 'help' });
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
      'Reply STOP to opt out at any time. Msg & data rates may apply.'
  );

  return json({ success: true, action: 'link', matched: true });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
