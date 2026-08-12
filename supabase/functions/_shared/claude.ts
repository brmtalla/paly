import Anthropic from 'npm:@anthropic-ai/sdk@0.116.0';

/**
 * Every model call in Paly goes through this module so the key, the model, and
 * the error shape are decided in exactly one place.
 */
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

export const CLAUDE_MODEL = 'claude-sonnet-5';

let client: Anthropic | null = null;

export function hasClaudeKey(): boolean {
  return !!ANTHROPIC_API_KEY;
}

export function claude(): Anthropic {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  client ??= new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  return client;
}

/** Uniform 503 for the handful of endpoints that are useless without the model. */
export function aiUnavailableResponse(corsHeaders: Record<string, string>): Response {
  console.error('ANTHROPIC_API_KEY is not configured');
  return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
    status: 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Concatenates the text blocks of a response.
 *
 * A response can also carry thinking blocks, so indexing content[0] is not
 * safe — and on a refusal there are no text blocks at all, which surfaces here
 * as an empty string for the caller to reject.
 */
export function textFrom(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

/**
 * Safety classifiers can decline a request with a 200 and no content, so every
 * caller has to check this before reading the text.
 */
export function wasRefused(message: Anthropic.Message): boolean {
  return message.stop_reason === 'refusal';
}
