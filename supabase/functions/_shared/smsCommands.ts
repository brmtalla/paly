/**
 * Parsing for inbound SMS/iMessage bodies.
 *
 * Deliberately free of imports so the same logic can be unit-tested from the
 * app's Jest suite — the rest of supabase/functions depends on Deno globals and
 * remote ESM, neither of which loads under Jest.
 */

/** Ambiguous glyphs (0/O, 1/I/L, U) are excluded — students retype these. */
export const LINK_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
export const LINK_CODE_LENGTH = 6;

/**
 * Carriers require these to work, and they must work regardless of casing or
 * surrounding punctuation. STOPALL/QUIT/END/CANCEL are the CTIA-standard set.
 */
const STOP_WORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);
const START_WORDS = new Set(['START', 'UNSTOP', 'RESUME', 'YES']);
const HELP_WORDS = new Set(['HELP', 'INFO']);

/**
 * Reduces a number to E.164 so the value stored on the profile always matches
 * what the webhook receives — otherwise a STOP from the same handset would not
 * find the row it needs to opt out.
 *
 * Returns null when the input cannot be a North American number; Paly does not
 * send internationally, and guessing a country code would text a stranger.
 */
export function normalizePhoneNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;

  return null;
}

export type InboundKind = 'stop' | 'start' | 'help' | 'link' | 'unknown';

export interface InboundCommand {
  kind: InboundKind;
  /** Present only when kind is 'link'. */
  code?: string;
}

/** Uppercase, collapse whitespace, drop anything that is not alphanumeric or space. */
export function normalizeInbound(body: string): string {
  return body
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isValidLinkCode(candidate: string): boolean {
  if (candidate.length !== LINK_CODE_LENGTH) return false;

  for (const ch of candidate) {
    if (!LINK_CODE_ALPHABET.includes(ch)) return false;
  }

  return true;
}

/**
 * Classifies an inbound message.
 *
 * Keyword checks come first and only match when the keyword is the entire
 * message: a student writing "I need help with stereoisomers" is asking a
 * question, not opting out. Carrier rules only require the bare keyword.
 */
export function classifyInbound(body: string): InboundCommand {
  const normalized = normalizeInbound(body);

  if (normalized.length === 0) return { kind: 'unknown' };

  if (STOP_WORDS.has(normalized)) return { kind: 'stop' };
  if (START_WORDS.has(normalized)) return { kind: 'start' };
  if (HELP_WORDS.has(normalized)) return { kind: 'help' };

  // The opt-in message is pre-filled by the app, but students edit and retype
  // it, so accept the code anywhere in the body rather than demanding a format.
  for (const token of normalized.split(' ')) {
    if (isValidLinkCode(token)) return { kind: 'link', code: token };
  }

  return { kind: 'unknown' };
}
