/**
 * Client copy of the SMS bullet formatter. In-app nuggets and texts have to
 * read the same — a paragraph in the app and a list in Messages is two products.
 */

export const BULLET = '•';

const LEADING_MARKER = /^\s*(?:[•‣◦⁃∙*+–—-]|\d+[.)])\s+/;

function stripMarker(line: string): string {
  return line.replace(LEADING_MARKER, '').trim();
}

function isMarked(line: string): boolean {
  return LEADING_MARKER.test(line);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function toBullets(input: string | string[] | null | undefined): string {
  if (!input) return '';

  const items = Array.isArray(input) ? input : linesFrom(input);

  return items
    .map((item) => stripMarker(item))
    .filter(Boolean)
    .flatMap((item) => (item.length > 180 ? splitSentences(item) : [item]))
    .map((item) => `${BULLET} ${item}`)
    .join('\n');
}

function linesFrom(text: string): string[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.some(isMarked)) return lines;

  return lines.flatMap((line) => (line.length > 160 ? splitSentences(line) : [line]));
}
