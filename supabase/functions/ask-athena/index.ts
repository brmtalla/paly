import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { requireUserId, unauthorizedResponse } from '../_shared/auth.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';
import { isPro } from '../_shared/entitlement.ts';
import { aiUnavailableResponse, hasClaudeKey } from '../_shared/claude.ts';
import { answerStudyQuestion } from '../_shared/tutor.ts';

/**
 * In-app twin of the SMS question flow: same grounding, same rate limit, same
 * answers — so a student gets the same companion whichever surface they use.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let userId: string;
  try {
    userId = await requireUserId(req);
  } catch (error) {
    return unauthorizedResponse(error);
  }

  try {
    if (!hasClaudeKey()) {
      return aiUnavailableResponse(corsHeaders);
    }

    const { question } = await req.json();

    if (typeof question !== 'string' || question.trim().length < 2) {
      return json({ error: 'Ask a question first.' }, 400);
    }

    // Entitlement is read server-side; the client can claim anything.
    if (!(await isPro(userId))) {
      return json(
        { error: 'upgrade_required', message: 'Asking about your material is a Paly Pro feature.' },
        402
      );
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, assistant_name')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) return json({ error: 'Profile not found' }, 404);

    const result = await answerStudyQuestion(profile, question, 'app');

    if (result.ok) {
      return json({ answer: result.answer });
    }

    // The client renders these directly, so each one has to read like the
    // companion talking rather than an error code.
    const messages: Record<typeof result.reason, string> = {
      no_material:
        "I haven't got anything from you yet — upload a lecture and I'll have material to work from.",
      rate_limited: "That's a lot of questions for one day. Ask me again tomorrow.",
      too_long: 'That one is too long. Try asking it in a sentence or two.',
      failed: "I couldn't get to that one. Try again in a moment.",
    };

    const status = result.reason === 'rate_limited' ? 429 : result.reason === 'failed' ? 500 : 400;

    return json({ error: result.reason, message: messages[result.reason] }, status);
  } catch (error) {
    console.error('Ask error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
