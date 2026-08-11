import { supabaseAdmin } from './supabase.ts';

/**
 * A quiz counts as passed at 80% correct. This is the bar for keeping the
 * study-delivery privilege alive — merely completing a quiz is not enough.
 * Mirror of QUIZ_PASS_THRESHOLD in src/lib/constants.ts and the 0.8 check in
 * the award_paly_points migration; keep the three in sync.
 */
export const QUIZ_PASS_THRESHOLD = 0.8;

/**
 * True if the user has any completed attempt for this content scoring at or
 * above the pass threshold. Computed from quiz_attempts (the source of truth)
 * rather than the user-mutable synthesized_content.quiz_deadline_notified flag.
 */
export async function hasPassingQuizAttempt(synthesizedContentId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('quiz_attempts')
    .select('questions_answered, correct_answers')
    .eq('synthesized_content_id', synthesizedContentId)
    .not('completed_at', 'is', null);

  if (!data) return false;

  return data.some(
    (a) =>
      a.questions_answered > 0 &&
      a.correct_answers / a.questions_answered >= QUIZ_PASS_THRESHOLD
  );
}
