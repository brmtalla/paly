import { supabaseAdmin } from './supabase.ts';
import { sendSmsToProfile } from './sms.ts';
import { sendPushToUser } from './push.ts';

/** Send the nudge once the trial has this many hours or less remaining. */
const NUDGE_WINDOW_HOURS = 24;

export interface TrialNudgeResult {
  nudged: number;
  failed: number;
}

/**
 * Warns trialists whose free week is about to lapse.
 *
 * Deliberately delivered by SMS: the whole point of the trial is that the
 * student has grown used to getting their study chunks as texts, so the most
 * persuasive possible moment is the last text in that thread telling them it is
 * about to stop. Push is a fallback for anyone without a number on file.
 *
 * Idempotent — trial_nudge_sent_at gates it to one message per trial, so this is
 * safe to call from the every-5-minutes delivery job.
 */
export async function nudgeExpiringTrials(): Promise<TrialNudgeResult> {
  const result: TrialNudgeResult = { nudged: 0, failed: 0 };

  const cutoff = new Date(Date.now() + NUDGE_WINDOW_HOURS * 3600 * 1000).toISOString();

  const { data: expiring } = await supabaseAdmin
    .from('profiles')
    .select('id, phone_number, sms_opted_in, assistant_name, premium_until, reading_streak')
    .eq('is_trial', true)
    .eq('is_premium', true)
    .is('trial_nudge_sent_at', null)
    .not('premium_until', 'is', null)
    .lte('premium_until', cutoff)
    .gt('premium_until', new Date().toISOString());

  if (!expiring || expiring.length === 0) return result;

  for (const profile of expiring) {
    const name = profile.assistant_name || 'Paly';
    const streak = profile.reading_streak || 0;

    const message =
      `${name} here. Your free week ends tomorrow — this is the last study text I can send you.\n\n` +
      (streak > 1 ? `You're on a ${streak}-day reading streak. ` : '') +
      `Your chunks and quizzes stay free in the app, but the texts stop unless you keep Pro.\n\n` +
      `Keep them coming: open Paly → Settings → Subscription.`;

    let ok = false;

    const sms = await sendSmsToProfile(profile, message);
    ok = sms.success;

    // No number on file (or the text bounced) — still make sure they hear it.
    if (!ok) {
      const push = await sendPushToUser(profile.id, {
        title: 'Your free week ends tomorrow',
        body: 'Study texts stop unless you keep Paly Pro. Tap to review your plan.',
        data: { type: 'trial_ending' },
      });
      ok = push.sent > 0;
    }

    if (ok) {
      await supabaseAdmin
        .from('profiles')
        .update({ trial_nudge_sent_at: new Date().toISOString() })
        .eq('id', profile.id);
      result.nudged++;
    } else {
      result.failed++;
    }
  }

  return result;
}
