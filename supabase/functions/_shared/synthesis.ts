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
 * Structured outputs rejects array size constraints outright: `minItems` and
 * `maxItems` other than 0 or 1 fail the whole request with a 400, taking the
 * upload down with them. Counts belong in `description`, where the model
 * follows them closely — that is what produces exactly `numStudyDays` chunks
 * and four options a question.
 */
function synthesisSchema(numStudyDays: number) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'keyTakeaways', 'flashcards', 'quizQuestions', 'dailyChunks'],
    properties: {
      summary: {
        type: 'string',
        description:
          'Two or three paragraphs covering the full scope of the testable material and how its concepts connect. Read in the app, not sent as a text. Do not recap assignments, agendas, or logistics.',
      },
      keyTakeaways: {
        type: 'array',
        description: '8-12 exam-ready points. Each is one complete thought, 1-2 sentences, no bullet marker.',
        items: { type: 'string' },
      },
      flashcards: {
        type: 'array',
        description:
          '12-25 cards spread across the study days by concept, not by source length. Foundations early, mechanisms middle, comparisons and exam traps late.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['front', 'back', 'day'],
          properties: {
            front: { type: 'string', description: 'A question testing one concept.' },
            back: {
              type: 'string',
              description: 'A 2-4 sentence answer that explains, not just names.',
            },
            day: { type: 'integer', description: 'The study day this card unlocks on.' },
          },
        },
      },
      quizQuestions: {
        type: 'array',
        description: '8-15 questions mixing recall, application, and synthesis of the testable ideas.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['question', 'options', 'correct_index', 'explanation'],
          properties: {
            question: { type: 'string' },
            options: {
              type: 'array',
              description: 'Four options; wrong ones are real misconceptions.',
              items: { type: 'string' },
            },
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
        description: `Exactly ${numStudyDays} entries, day 1 through ${numStudyDays}, covering the material by concept weight.`,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['day', 'bullets'],
          properties: {
            day: { type: 'integer' },
            bullets: {
              type: 'array',
              description:
                "5-9 bullets. Each is ONE idea in 1-2 sentences, no leading marker. Never a paragraph. When introducing a term, open with it in caps: 'CAP THEOREM: a distributed system can only guarantee 2 of consistency, availability, and partition tolerance.'",
              items: { type: 'string' },
            },
          },
        },
      },
    },
  } as const;
}

function systemPrompt(numStudyDays: number): string {
  return `You turn lecture material into a ${numStudyDays}-day study plan that a student reads on their phone, one day at a time, until the day before their next class. The same bullets are shown in the app and sent as a text. Never write a paragraph for a daily chunk.

WHAT TO KEEP
Cover every testable idea: definitions, mechanisms, relationships, worked examples, named theorems, numbers that would appear on an exam. The student is learning this to be examined on it.

WHAT TO DROP
Throw out filler. Do not study-ify agendas, "any questions" slides, assignment rubrics, due dates, references, YouTube links, workshop logistics, or in-class exercise instructions. One passing mention is enough if the class actually did an exercise.

HOW TO SPLIT THE DAYS
Split by concept weight, not by slide count or page count. A long narrative history section is lighter than a short, dense mechanisms section. Spread the testable ideas evenly across all ${numStudyDays} days — do not front-load, and do not leave day ${numStudyDays} as a thin recap.

Sequence so each day stands alone but builds on the last:
- Day 1: vocabulary and the shape of the topic.
- Early days: each major concept, with a concrete example.
- Middle days: how concepts relate — processes, mechanisms, cause and effect.
- Later days: applications, edge cases, comparisons, and the misconceptions students actually have.
- Final day: how the topics connect, and how they would be examined.

When a day builds on an earlier one, say so in a few words as you open it.

BULLET RULES (this is the product)
- 5-9 bullets per day.
- One idea per bullet, 1-2 sentences, readable in a breath.
- No paragraphs. No multi-idea run-ons.
- When introducing a term, open with the term in CAPS, then a colon, then the point.
- These bullets are the study nugget. Do not summarize so hard that a key point disappears, and do not regurgitate the source.`;
}

function userPrompt(content: string, className: string | undefined, numStudyDays: number): string {
  const source = className ? `lecture material from ${className}` : 'lecture material';

  return `Here is the ${source}. Build exactly ${numStudyDays} days of study content from it. Drop filler. Keep every testable idea. Split by concept weight, not source length.

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
      format: { type: 'json_schema', schema: synthesisSchema(numStudyDays) },
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
