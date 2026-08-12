import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { toBullets } from '../_shared/bullets.ts';
import { requireUserId, unauthorizedResponse } from '../_shared/auth.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';
import { sendSmsToProfile } from '../_shared/sms.ts';
import { isPro } from '../_shared/entitlement.ts';

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
    const { synthesizedContentId } = await req.json();

    if (!synthesizedContentId) {
      return new Response(JSON.stringify({ error: 'Missing synthesizedContentId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Texting study content on demand is a Paly Pro feature.
    if (!(await isPro(userId))) {
      return new Response(
        JSON.stringify({
          error: 'pro_required',
          message: 'Texting your study content is a Paly Pro feature. Upgrade to send it to your phone.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('phone_number, sms_opted_in, assistant_name')
      .eq('id', userId)
      .single();

    if (!profile?.phone_number) {
      return new Response(JSON.stringify({ error: 'No phone number set on your profile' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: content, error: contentError } = await supabaseAdmin
      .from('synthesized_content')
      .select('*, classes:class_id (name)')
      .eq('id', synthesizedContentId)
      .eq('user_id', userId)
      .single();

    if (contentError || !content) {
      return new Response(JSON.stringify({ error: 'Synthesized content not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const className = (content as any).classes?.name || 'your class';

    // Build a pool of sendable pieces from this session's content
    // `bulleted` marks the pieces that are study material rather than a single
    // line — a takeaway is already one thought and a flashcard is a Q/A pair,
    // so bulleting either would just chop it up.
    const pool: { type: string; text: string; bulleted?: boolean }[] = [];

    const takeaways = content.key_takeaways as string[] | null;
    if (takeaways?.length) {
      for (const t of takeaways) {
        pool.push({ type: 'key takeaway', text: t });
      }
    }

    const flashcards = content.flashcards as { front: string; back: string }[] | null;
    if (flashcards?.length) {
      for (const f of flashcards) {
        pool.push({ type: 'flashcard', text: `Q: ${f.front}\nA: ${f.back}` });
      }
    }

    const chunks = content.daily_chunks as { day: number; content: string }[] | null;
    if (chunks?.length) {
      for (const c of chunks) {
        pool.push({ type: `study chunk, day ${c.day}`, text: c.content, bulleted: true });
      }
    }

    if (content.summary) {
      pool.push({ type: 'summary', text: content.summary, bulleted: true });
    }

    if (pool.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No study content available for this session' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pick = pool[Math.floor(Math.random() * pool.length)];

    const smsBody = `🧠 ${className} · ${pick.type}\n\n${pick.bulleted ? toBullets(pick.text) : pick.text}`;

    const result = await sendSmsToProfile(profile, smsBody);

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error || 'SMS send failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: { type: pick.type, preview: pick.text.substring(0, 100) },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Send now error:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
