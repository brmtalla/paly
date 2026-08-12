/**
 * Study chunks are read on a phone, usually between classes. Bullets are the
 * only format that survives that — a wall of prose in an iMessage bubble gets
 * skimmed and closed.
 *
 * Synthesis now returns bullets as an array, so the shape is guaranteed at the
 * source. This module is the belt to that pair of braces: it also normalises
 * chunks that were synthesised before the change, and anything a model returns
 * with its own stray markers.
 */

export const BULLET = '•';

/** Leading marker in any of the forms a model reaches for. */
const LEADING_MARKER = /^\s*(?:[•‣◦⁃∙*+–—-]|\d+[.)])\s+/;

/** Strips any marker the model added so we never end up with "• - foo". */
function stripMarker(line: string): string {
  return line.replace(LEADING_MARKER, '').trim();
}

function isMarked(line: string): boolean {
  return LEADING_MARKER.test(line);
}

/**
 * Splits prose into sentence-sized pieces.
 *
 * Only used to rescue legacy paragraph chunks — deliberately conservative, so
 * abbreviations and decimals do not get chopped mid-thought.
 */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Renders study content as a bullet list.
 *
 * Accepts the array synthesis now produces, or a string from a row written
 * before that change.
 */
export function toBullets(input: string | string[] | null | undefined): string {
  if (!input) return '';

  const items = Array.isArray(input) ? input : linesFrom(input);

  return items
    .map((item) => stripMarker(item))
    .filter(Boolean)
    .map((item) => `${BULLET} ${item}`)
    .join('\n');
}

/**
 * Turns a stored chunk string into bullet-sized pieces.
 *
 * If the text already carries markers we trust its line breaks; a single
 * unmarked block gets split by sentence instead, which is the case the
 * paragraph-shaped legacy rows fall into.
 */
function linesFrom(text: string): string[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.some(isMarked)) return lines;

  // No markers anywhere: one or more prose paragraphs.
  return lines.flatMap((line) => (line.length > 160 ? splitSentences(line) : [line]));
}

/** True when the text is already a bullet list and needs nothing done to it. */
export function isBulleted(text: string): boolean {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.length > 1 && lines.every(isMarked);
}
