// Shared text normalization.
//
// Two different jobs live here and they are deliberately separate:
//
// `stripInvisible` is a *sanitizer* — it runs on anything that will be stored,
// echoed, or interpolated into a prompt. It removes characters that render as
// nothing but change how a string compares, which is how an "ignore previous
// instructions" carrying a zero-width space slips past a regex that looks
// perfectly correct.
//
// `normalizeForMatch` is a *matcher* — it is lossy on purpose (case folded,
// whitespace collapsed) and its output is only ever used for comparisons,
// never stored or shown to anyone.

// Character classes are built from code points rather than written as literals.
// A literal zero-width space in source is invisible to the next reader, and an
// escape sequence is one careless copy-paste away from being flattened into the
// character it stands for. Numbers survive both.
type CodePointRange = [start: number, end: number];

function charClass(ranges: CodePointRange[]): string {
  return ranges
    .map(([start, end]) =>
      start === end
        ? String.fromCodePoint(start)
        : `${String.fromCodePoint(start)}-${String.fromCodePoint(end)}`
    )
    .join('');
}

// Zero-width and formatting characters. The bidi set matters because it can
// visually reorder a string, so what a human reviews is not what a matcher sees.
const INVISIBLE_RANGES: CodePointRange[] = [
  [0x00ad, 0x00ad], // soft hyphen
  [0x180e, 0x180e], // Mongolian vowel separator
  [0x200b, 0x200f], // ZWSP, ZWNJ, ZWJ, LRM, RLM
  [0x202a, 0x202e], // LRE, RLE, PDF, LRO, RLO
  [0x2060, 0x2064], // word joiner, invisible operators
  [0x2066, 0x2069], // bidi isolates
  [0xfeff, 0xfeff], // BOM / zero-width no-break space
];

// C0 and C1 control characters, keeping \n (0x0a), \r (0x0d) and \t (0x09).
const CONTROL_RANGES: CodePointRange[] = [
  [0x0000, 0x0008],
  [0x000b, 0x000c],
  [0x000e, 0x001f],
  [0x007f, 0x009f],
];

const INVISIBLE_CHARS = new RegExp(`[${charClass(INVISIBLE_RANGES)}]`, 'gu');
const CONTROL_CHARS = new RegExp(`[${charClass(CONTROL_RANGES)}]`, 'gu');

/**
 * Removes characters that are invisible or control-only. Safe to run on text
 * that will be persisted or shown — it does not change case or word boundaries.
 */
export function stripInvisible(input: string): string {
  return input.replace(INVISIBLE_CHARS, '').replace(CONTROL_CHARS, '');
}

/**
 * Canonical form for keyword and pattern matching. NFKC folds the compatibility
 * lookalikes (fullwidth Latin, ligatures, styled math letters) that would
 * otherwise let the same word through under a different code point.
 *
 * Lossy — for comparison only.
 */
export function normalizeForMatch(input: string): string {
  return stripInvisible(input.normalize('NFKC')).toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Escapes a string for literal use inside a RegExp.
 */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a word-boundary matcher for a literal phrase. Used instead of
 * `String.includes` so "go" does not match "going" and "mcp" does not match
 * "mcpherson". `\b` is avoided because it treats "." and "-" as boundaries,
 * which would break matching on names like "nomoji.dev".
 */
export function wordBoundaryPattern(phrase: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(phrase)}(?![\\p{L}\\p{N}])`, 'iu');
}
