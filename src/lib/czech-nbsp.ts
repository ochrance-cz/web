// Single-letter Czech prepositions/conjunctions (k, s, v, z, o, u, a, i) must not end a line.
// Joins the letter to the following word with a non-breaking space.
const ONE_LETTER = /(^|[\s(„"'>])([ksvzouaiKSVZOUAI])\s+/g;
const NBSP = ' ';

/** Apply the rule to plain text (no markup). */
export function nbspOneLetter(text: string | undefined | null): string {
  if (!text) return '';
  let v = text;
  // run twice to catch overlapping matches ("k o")
  v = v.replace(ONE_LETTER, (_m, pre, w) => `${pre}${w}${NBSP}`);
  v = v.replace(ONE_LETTER, (_m, pre, w) => `${pre}${w}${NBSP}`);
  return v;
}

/** Apply the rule to the text between tags of an HTML string; tags and attributes stay untouched. */
export function nbspOneLetterHtml(html: string | undefined | null): string {
  if (!html) return '';
  return html
    .split(/(<[^>]*>)/)
    .map((part) => (part.startsWith('<') ? part : nbspOneLetter(part)))
    .join('');
}
