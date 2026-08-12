import { supabaseAdmin } from './supabase.ts';
import { claude, CLAUDE_MODEL, textFrom, wasRefused } from './claude.ts';

/**
 * Ask-your-companion: a student replies to a study text with a question, and
 * gets an answer grounded in the material Paly has already sent them.
 *
 * Deliberately SMS-only. Talking back and forth is the thing you get for having
 * her in your Messages thread, so putting it in the app would give it away.
 *
 * Grounding is deliberately limited to *delivered* prompts. Everything Paly
 * does rests on releasing material one day at a time, so answering out of a
 * chunk that has not arrived yet would quietly undo the product.
 */

/** Questions per rolling day, per student. High enough to never be felt. */
const DAILY_QUESTION_LIMIT = 30;

/** Beyond this a "question" is a pasted essay, not something to answer by text. */
const MAX_QUESTION_CHARS = 600;

/** Recent chunks carry the conversation; older ones are rarely what is being asked about. */
const MAX_PROMPTS = 30;
const MAX_CONTEXT_CHARS = 40000;

export type TutorResult =
  | { ok: true; answer: string }
  | { ok: false; reason: 'no_material' | 'rate_limited' | 'too_long' | 'failed' };

interface TutorProfile {
  id: string;
  assistant_name?: string | null;
}

/**
 * Builds the grounding context out of what the student has actually received.
 *
 * Returns null when they have received nothing yet — there is no honest answer
 * to give in that case, and guessing would be worse than saying so.
 */
async function buildContext(userId: string): Promise<string | null> {
  const { data: prompts } = await supabaseAdmin
    .from('study_prompts')
    .select('content, prompt_type, day_index, delivered_at, synthesized_content_id, classes:class_id (name)')
    .eq('user_id', userId)
    .not('delivered_at', 'is', null)
    .order('delivered_at', { ascending: false })
    .limit(MAX_PROMPTS);

  if (!prompts || prompts.length === 0) return null;

  const contentIds = [
    ...new Set(prompts.map((p: any) => p.synthesized_content_id).filter(Boolean)),
  ];

  const summaryByContentId = new Map<string, string>();

  if (contentIds.length > 0) {
    const { data: contents } = await supabaseAdmin
      .from('synthesized_content')
      .select('id, summary')
      .in('id', contentIds);

    for (const row of contents ?? []) {
      if (row.summary) summaryByContentId.set(row.id, row.summary);
    }
  }

  // Oldest first, so the transcript reads forward the way the student lived it.
  const sections = [...prompts].reverse().map((p: any) => {
    const className = p.classes?.name || 'your class';
    const when = p.delivered_at ? String(p.delivered_at).split('T')[0] : 'recently';
    return `## ${className} — day ${p.day_index} (${p.prompt_type}, sent ${when})\n${p.content}`;
  });

  const summaries = [...summaryByContentId.values()].map(
    (summary) => `## Lecture overview\n${summary}`
  );

  let context = [...summaries, ...sections].join('\n\n');

  if (context.length > MAX_CONTEXT_CHARS) {
    // Trim from the front: the oldest material is the least likely subject.
    context = context.slice(context.length - MAX_CONTEXT_CHARS);
  }

  return context;
}

function systemPrompt(assistantName: string): string {
  return `You are ${assistantName}, the study companion this student already gets their daily material from. They are replying to one of those messages with a question.

Answer from the study material below — it is everything you have sent them so far. Lead with the answer itself, in the first sentence. If a comparison or a list is the clearest form, use bullets; otherwise write plainly.

You are answering in a text message. Stay under 600 characters — normally two or three bullets, or a couple of sentences when that reads better.

If the material does not cover what they asked, say so in a few words and give them the short general answer anyway — then tell them which day's chunk is closest. Do not invent detail that is not in the material and do not claim their material says something it does not.

If the answer relates to something they will be quizzed on, you can say so once. Do not do it every time.

Talk the way you do in their thread: direct, warm, a peer who knows the material. No greeting, no sign-off, no "great question". Do not restate their question back to them.`;
}

/** Rolling-24h cap. A runaway sender should not be able to spend the API budget. */
async function isRateLimited(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count } = await supabaseAdmin
    .from('tutor_questions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);

  return (count ?? 0) >= DAILY_QUESTION_LIMIT;
}

export async function answerStudyQuestion(
  profile: TutorProfile,
  question: string
): Promise<TutorResult> {
  const trimmed = question.trim();

  if (trimmed.length > MAX_QUESTION_CHARS) return { ok: false, reason: 'too_long' };
  if (await isRateLimited(profile.id)) return { ok: false, reason: 'rate_limited' };

  const context = await buildContext(profile.id);
  if (!context) return { ok: false, reason: 'no_material' };

  const assistantName = profile.assistant_name || 'Paly';

  try {
    // Low effort with adaptive thinking: the answer has to land while the
    // student is still looking at their phone, and the material it needs is
    // already in front of the model.
    const message = await claude().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      system: systemPrompt(assistantName),
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      messages: [
        {
          role: 'user',
          content: `<study_material>\n${context}\n</study_material>\n\nTheir question: ${trimmed}`,
        },
      ],
    });

    if (wasRefused(message)) {
      console.error('Tutor answer refused:', message.stop_details);
      return { ok: false, reason: 'failed' };
    }

    const answer = textFrom(message);
    if (!answer) return { ok: false, reason: 'failed' };

    await supabaseAdmin.from('tutor_questions').insert({
      user_id: profile.id,
      channel: 'sms',
      question: trimmed,
      answer,
    });

    return { ok: true, answer };
  } catch (error) {
    console.error('Tutor answer failed:', error);
    return { ok: false, reason: 'failed' };
  }
}
