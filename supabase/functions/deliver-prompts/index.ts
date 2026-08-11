import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';
import { sendSmsToProfile } from '../_shared/sms.ts';
import { sendPushToUser } from '../_shared/push.ts';
import { proUserIds } from '../_shared/entitlement.ts';
import { hasPassingQuizAttempt } from '../_shared/quiz.ts';
import { nudgeExpiringTrials } from '../_shared/trial.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const now = new Date();
    const nowISO = now.toISOString();
    const todayDate = nowISO.split('T')[0];

    // ── Quiz enforcement: check for overdue quizzes ───────────────────
    const quizEnforcementResults = await enforceQuizDeadlines(todayDate, now);

    // Collect user IDs that are blocked (have overdue quizzes at level 3+)
    const blockedUserClassPairs = new Set(
      quizEnforcementResults.blocked.map((b: any) => `${b.userId}:${b.classId}`)
    );

    // ── Trial conversion nudge ────────────────────────────────────────
    // Must run before the "no prompts due" early return below, otherwise it
    // would be skipped on the vast majority of runs.
    const trialNudges = await nudgeExpiringTrials();

    // ── Normal prompt delivery ────────────────────────────────────────
    const { data: duePrompts, error: fetchError } = await supabaseAdmin
      .from('study_prompts')
      .select(
        `
        *,
        classes:class_id (name)
      `
      )
      .lte('scheduled_for', nowISO)
      .is('delivered_at', null)
      .order('scheduled_for')
      .limit(50);

    if (fetchError) {
      console.error('Fetch prompts error:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch due prompts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!duePrompts || duePrompts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          delivered: 0,
          quizEnforcement: quizEnforcementResults,
          trialNudges,
          message: 'No prompts due',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userIds = [...new Set(duePrompts.map((p) => p.user_id))];
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, phone_number, sms_opted_in, full_name, assistant_name, streak_count')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Paly Pro adds SMS/iMessage on top of push; everyone gets the push.
    const proUsers = await proUserIds(userIds);

    let delivered = 0;
    let failed = 0;
    let blocked = 0;
    let pushed = 0;
    let texted = 0;

    for (const prompt of duePrompts) {
      const pairKey = `${prompt.user_id}:${prompt.class_id}`;

      // Block delivery for classes with overdue quizzes at level 3+
      if (blockedUserClassPairs.has(pairKey) && prompt.prompt_type !== 'quiz') {
        blocked++;
        continue;
      }

      const profile = profileMap.get(prompt.user_id);
      const className = (prompt as any).classes?.name || 'your class';
      const assistantName = profile?.assistant_name || 'Paly';

      // ── Free tier: push notification into the app ────────────────────
      const pushResult = await sendPushToUser(prompt.user_id, {
        title: pushTitle(prompt.prompt_type, className, assistantName),
        body: pushPreview(prompt.content),
        data: {
          type: prompt.prompt_type === 'quiz' ? 'quiz_prompt' : 'study_prompt',
          promptId: prompt.id,
          classId: prompt.class_id,
          synthesizedContentId: prompt.synthesized_content_id,
        },
      });
      const pushOk = pushResult.sent > 0;
      if (pushOk) pushed++;

      // ── Paly Pro: same content delivered by text ─────────────────────
      let smsOk = false;
      if (proUsers.has(prompt.user_id)) {
        const smsBody = formatPromptMessage(prompt, className, assistantName);
        const smsResult = await sendSmsToProfile(profile, smsBody);
        smsOk = smsResult.success;
        if (smsOk) texted++;
      }

      // A prompt counts as delivered if it reached the student either way.
      if (pushOk || smsOk) {
        await supabaseAdmin
          .from('study_prompts')
          .update({ delivered_at: new Date().toISOString() })
          .eq('id', prompt.id);
        delivered++;
      } else {
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        delivered,
        pushed,
        texted,
        failed,
        blocked,
        total: duePrompts.length,
        quizEnforcement: quizEnforcementResults,
        trialNudges,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Deliver prompts error:', error?.message, error?.stack);
    return new Response(JSON.stringify({ error: 'Internal server error during prompt delivery' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function enforceQuizDeadlines(todayDate: string, now: Date) {
  const reminders: any[] = [];
  const blocked: any[] = [];
  const streaksBroken: any[] = [];

  // Find synthesized content with quiz deadlines that have passed or are today
  const { data: contentWithDeadlines } = await supabaseAdmin
    .from('synthesized_content')
    .select('id, class_id, user_id, next_class_date, quiz_deadline_notified')
    .not('next_class_date', 'is', null)
    .lte('next_class_date', todayDate);

  if (!contentWithDeadlines || contentWithDeadlines.length === 0) {
    return { reminders, blocked, streaksBroken };
  }

  // For each, check whether the quiz was PASSED (≥80%). Merely completing it
  // does not keep the privilege — the student has to actually pass.
  for (const sc of contentWithDeadlines) {
    const passed = await hasPassingQuizAttempt(sc.id);

    if (passed) {
      // Quiz passed! If it was still in enforcement mode, reset it
      if (sc.quiz_deadline_notified > 0) {
        await supabaseAdmin
          .from('synthesized_content')
          .update({ quiz_deadline_notified: 0 })
          .eq('id', sc.id);

        // Increment streak
        await supabaseAdmin.rpc('increment_streak', { user_id_param: sc.user_id }).catch(() => {
          // Fallback: manual increment if RPC doesn't exist
          supabaseAdmin
            .from('profiles')
            .select('streak_count')
            .eq('id', sc.user_id)
            .single()
            .then(({ data: p }) => {
              if (p) {
                supabaseAdmin
                  .from('profiles')
                  .update({ streak_count: (p.streak_count || 0) + 1 })
                  .eq('id', sc.user_id);
              }
            });
        });
      }
      continue;
    }

    // Quiz not passed yet — escalate
    const level = sc.quiz_deadline_notified || 0;
    const nextClassDate = new Date(sc.next_class_date + 'T00:00:00');
    const dayBeforeClass = new Date(nextClassDate);
    dayBeforeClass.setDate(dayBeforeClass.getDate() - 1);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('phone_number, sms_opted_in, assistant_name, streak_count')
      .eq('id', sc.user_id)
      .single();

    if (!profile?.phone_number || !profile.sms_opted_in) continue;

    const { data: classInfo } = await supabaseAdmin
      .from('classes')
      .select('name')
      .eq('id', sc.class_id)
      .single();

    const className = classInfo?.name || 'your class';
    const assistantName = profile.assistant_name || 'Paly';
    const streak = profile.streak_count || 0;

    let message = '';
    let newLevel = level;

    if (todayDate <= dayBeforeClass.toISOString().split('T')[0] && level === 0) {
      // Day before class, first reminder
      message = `${assistantName} here! 📋 Your quiz for ${className} is ready. Pass it before tomorrow's class to keep your ${streak}-day streak alive!`;
      newLevel = 1;
    } else if (todayDate === sc.next_class_date && level <= 1) {
      // Morning of class day
      message = `${assistantName} here! ⚠️ Reminder: you haven't passed your ${className} quiz yet. Class is TODAY. Your streak is at risk!`;
      newLevel = 2;
    } else if (todayDate > sc.next_class_date && level <= 2) {
      // Class has passed, quiz still not passed — break streak
      message = `${assistantName} here! 😔 You didn't pass your ${className} quiz in time. Your ${streak}-day streak has been broken. Pass it now to resume study delivery.`;
      newLevel = 3;

      // Break the streak
      await supabaseAdmin.from('profiles').update({ streak_count: 0 }).eq('id', sc.user_id);

      streaksBroken.push({ userId: sc.user_id, classId: sc.class_id });
    } else if (level >= 3) {
      // Already at max escalation — block content, no more reminders
      blocked.push({ userId: sc.user_id, classId: sc.class_id, contentId: sc.id });
      continue;
    }

    if (message && newLevel > level) {
      await sendSmsToProfile(profile, message);
      await supabaseAdmin
        .from('synthesized_content')
        .update({ quiz_deadline_notified: newLevel })
        .eq('id', sc.id);
      reminders.push({ userId: sc.user_id, classId: sc.class_id, level: newLevel });
    }

    if (newLevel >= 3) {
      blocked.push({ userId: sc.user_id, classId: sc.class_id, contentId: sc.id });
    }
  }

  return { reminders, blocked, streaksBroken };
}

/** Notification title, in the companion's voice. */
function pushTitle(promptType: string, className: string, assistantName: string): string {
  switch (promptType) {
    case 'quiz':
      return `📋 Quiz ready for ${className}`;
    case 'flashcard':
      return `🎴 Flashcard — ${className}`;
    case 'recall':
      return `🧠 Quick recall — ${className}`;
    default:
      return `${assistantName} here! 📚 ${className}`;
  }
}

/**
 * Notifications truncate anyway, and the full chunk is one tap away in the app.
 * Cut on a word boundary so the preview never ends mid-word.
 */
function pushPreview(content: string, limit = 140): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  if (flat.length <= limit) return flat;

  const cut = flat.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 60 ? lastSpace : limit).trimEnd()}…`;
}

function formatPromptMessage(
  prompt: { prompt_type: string; content: string; day_index: number },
  className: string,
  assistantName: string
): string {
  const typeLabels: Record<string, string> = {
    takeaway: 'Key Takeaway',
    recall: 'Quick Recall',
    quiz: 'Quiz Time',
    flashcard: 'Flashcard',
  };

  const typeLabel = typeLabels[prompt.prompt_type] || 'Study Prompt';
  const dayLabel = `Day ${prompt.day_index}`;

  return `${assistantName} here! 📚\n\n[${typeLabel} - ${dayLabel}]\n${className}\n\n${prompt.content}`;
}
