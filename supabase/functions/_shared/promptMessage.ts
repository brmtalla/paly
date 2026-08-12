import { toBullets } from './bullets.ts';

/**
 * How a study nugget reads when it leaves Paly — as a text and as a push.
 *
 * Shared by deliver-prompts (the cron) and process-upload (chunks that are
 * already due the moment they are scheduled), which used to format the same
 * message two slightly different ways.
 */

const TYPE_LABELS: Record<string, string> = {
  takeaway: 'Key takeaway',
  recall: 'Quick recall',
  quiz: 'Quiz time',
  flashcard: 'Flashcard',
};

export interface DeliverablePrompt {
  prompt_type: string;
  content: string;
  day_index: number;
}

/**
 * The body of the text.
 *
 * One header line, then the bullets. The old format opened with a greeting and
 * a bracketed label on separate lines, which pushed the actual material below
 * the fold of the notification and made every message look like an email.
 *
 * Bullets are enforced here as well as at synthesis, so chunks written before
 * the schema change still arrive readable.
 */
export function formatPromptMessage(
  prompt: DeliverablePrompt,
  className: string,
  _assistantName: string
): string {
  // The quiz prompt is a written nudge, not study material — bulleting it would
  // chop one sentence into fragments.
  if (prompt.prompt_type === 'quiz') return prompt.content;

  const label = TYPE_LABELS[prompt.prompt_type] || 'Study nugget';
  const header = `📚 ${className} · ${label}, day ${prompt.day_index}`;

  return `${header}\n\n${toBullets(prompt.content)}`;
}

/** Notification title, in the companion's voice. */
export function pushTitle(promptType: string, className: string, assistantName: string): string {
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
export function pushPreview(content: string, limit = 140): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  if (flat.length <= limit) return flat;

  const cut = flat.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 60 ? lastSpace : limit).trimEnd()}…`;
}
