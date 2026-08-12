import { claude, CLAUDE_MODEL, textFrom, wasRefused } from './claude.ts';
import { toBullets } from './bullets.ts';

/**
 * Turning lecture material into a study plan. Shared by process-upload (the
 * real pipeline) and synthesize-content (the manual re-run), which previously
 * carried two copies of this prompt that had already drifted apart.
 */

export interface Flashcard {
  front: string;
  back: string;
  day: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

/** What gets stored, and what the app renders. `content` is a bullet list. */
export interface DailyChunk {
  day: number;
  content: string;
}

export interface Synthesis {
  summary: string;
  keyTakeaways: string[];
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
  dailyChunks: DailyChunk[];
}

/**
 * The model returns each day's chunk as an array of bullets, not as one string
 * it was asked nicely to format. That is the whole point: a schema the model
 * cannot satisfy with a paragraph is worth more than any amount of instruction
 * telling it not to write one.
 */
const SYNTHESIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'keyTakeaways', 'flashcards', 'quizQuestions', 'dailyChunks'],
  properties: {
    summary: {
      type: 'string',
      description:
        'Two or three paragraphs covering the full scope of the material and how its concepts connect. Read in the app, not sent as a text.',
    },
    keyTakeaways: {
      type: 'array',
      description: '8-12 items. Each is one complete thought, 1-3 sentences, no bullet marker.',
      items: { type: 'string' },
    },
    flashcards: {
      type: 'array',
      description:
        '15-25 cards spread evenly across the study days: foundations early, applications late.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['front', 'back', 'day'],
        properties: {
          front: { type: 'string', description: 'A question testing one concept.' },
          back: { type: 'string', description: 'A 2-4 sentence answer that explains, not just names.' },
          day: { type: 'integer', description: 'The study day this card unlocks on.' },
        },
      },
    },
    quizQuestions: {
      type: 'array',
      description: '10-15 questions mixing recall, application, and synthesis.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'options', 'correct_index', 'explanation'],
        properties: {
          question: { type: 'string' },
          options: { type: 'array', description: 'Four options; wrong ones are real misconceptions.', items: { type: 'string' } },
          correct_index: { type: 'integer', description: 'Zero-based index into options.' },
          explanation: {
            type: 'string',
            description: 'Why the right answer is right and each wrong one is wrong.',
          },
        },
      },
    },
    dailyChunks: {
      type: 'array',
      description: 'One entry per study day, in order.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['day', 'bullets'],
        properties: {
          day: { type: 'integer' },
          bullets: {
            type: 'array',
            description:
              "5-9 bullets. Each is one standalone idea in 1-2 sentences, written without a leading marker — the app adds it. Open with the key term in caps when introducing one, e.g. 'CONSIDERATION: something of value exchanged — money, goods, services, or a promise'.",
            items: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

function systemPrompt(numStudyDays: number): string {
  return `You build study material for a student who will receive it one day at a time, on their phone, over ${numStudyDays} days before their next class.

Work from the material you are given. Cover every definition, mechanism, relationship, and worked example in it — the student is learning this to be examined on it, not skimming for the gist. Spread the source evenly across the ${numStudyDays} days rather than front-loading it.

Sequence the days so each one can be read on its own but builds on the last:
- Day 1 establishes the vocabulary and the shape of the topic.
- Early days break down each major concept with examples.
- Middle days cover how concepts relate — processes, mechanisms, cause and effect.
- Later days cover applications, edge cases, comparisons, and the misconceptions students actually have.
- The final day connects the topics to each other and to how they would be examined.

When a day's material builds on an earlier day, say so in a few words as you introduce it. That reference is what makes the spacing work.

Each day's bullets are read in a text message, so each one carries a single idea a student can finish in a breath. Aim for 5-9 of them per day, adding up to roughly 700-1200 characters.`;
}

function userPrompt(content: string, className: string | undefined, numStudyDays: number): string {
  const source = className ? `lecture material from ${className}` : 'lecture material';

  return `Here is the ${source}. Build ${numStudyDays} days of study content from it.

${content.substring(0, 100000)}`;
}

/**
 * Bullets arrive as an array and become the stored chunk string here, so the
 * marker is applied in exactly one place and the DB shape the app reads
 * (`{ day, content }`) stays unchanged.
 */
function toDailyChunks(raw: { day: number; bullets: string[] }[]): DailyChunk[] {
  return raw
    .filter((chunk) => Array.isArray(chunk.bullets) && chunk.bullets.length > 0)
    .map((chunk) => ({ day: chunk.day, content: toBullets(chunk.bullets) }));
}

export async function synthesizeStudyContent(
  content: string,
  className: string | undefined,
  numStudyDays: number
): Promise<Synthesis> {
  // Streaming: a full synthesis runs to five figures of output tokens, and a
  // non-streaming request that size risks an HTTP timeout before it lands.
  const stream = claude().messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 32000,
    system: systemPrompt(numStudyDays),
    messages: [{ role: 'user', content: userPrompt(content, className, numStudyDays) }],
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: SYNTHESIS_SCHEMA },
    },
  });

  const message = await stream.finalMessage();

  if (wasRefused(message)) {
    console.error('Synthesis refused:', message.stop_details);
    throw new Error('That material could not be synthesized.');
  }

  if (message.stop_reason === 'max_tokens') {
    console.error('Synthesis truncated at max_tokens');
    throw new Error('AI synthesis failed');
  }

  const raw = textFrom(message);
  if (!raw) throw new Error('AI synthesis failed');

  // Structured outputs guarantees the shape, so a parse failure here is a real
  // fault rather than the usual stray-markdown-fence case.
  const parsed = JSON.parse(raw);

  const dailyChunks = toDailyChunks(parsed.dailyChunks ?? []);

  if (!parsed.summary || !parsed.keyTakeaways?.length || !dailyChunks.length) {
    throw new Error('AI response missing required fields');
  }

  return {
    summary: parsed.summary,
    keyTakeaways: parsed.keyTakeaways,
    flashcards: parsed.flashcards ?? [],
    quizQuestions: parsed.quizQuestions ?? [],
    dailyChunks,
  };
}

/**
 * Reads a PDF directly — Claude takes the document natively, so there is no
 * separate extraction service to keep running.
 *
 * Thinking is off: this is transcription, and the latency would buy nothing.
 */
export async function extractPdfText(base64Data: string): Promise<string> {
  const stream = claude().messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 32000,
    thinking: { type: 'disabled' },
    output_config: { effort: 'low' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64Data },
          },
          {
            type: 'text',
            text: 'Transcribe all of the text in this document, in reading order, with a blank line between sections. Return only the text — no commentary, no summary, no markdown.',
          },
        ],
      },
    ],
  });

  const message = await stream.finalMessage();

  if (wasRefused(message)) {
    console.error('PDF extraction refused:', message.stop_details);
    throw new Error('Failed to read PDF');
  }

  return textFrom(message);
}
