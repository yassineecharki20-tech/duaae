/**
 * DUAA — Arabic text utilities.
 *
 * Search has to be forgiving: users type without tashkeel, with different
 * alef/ya/ta-marbuta forms, and with tatweel. Normalising both the query and
 * the corpus once (at index build time) keeps search fast *and* accurate.
 */

/** Tashkeel, tatweel and Quranic annotation marks — all removed for matching. */
const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/** Characters that should collapse to a single canonical form. */
const EQUIVALENCES: readonly [RegExp, string][] = [
  [/[أإآٱ]/g, 'ا'],
  [/ى/g, 'ي'],
  [/ؤ/g, 'و'],
  [/ئ/g, 'ي'],
  [/ة/g, 'ه'],
  [/گ/g, 'ك'],
  [/پ/g, 'ب'],
  [/چ/g, 'ج'],
  [/ژ/g, 'ز'],
  [/\u0622/g, 'ا'],
];

const ARABIC_LETTER = /[\u0621-\u064A\u0660-\u0669]/;

/** Strip diacritics and fold letters so `الإله` matches `الاله`. */
export function normalizeArabic(input: string): string {
  if (!input) return '';
  let output = input.replace(DIACRITICS, '');
  for (const [pattern, replacement] of EQUIVALENCES) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

/** Normalise + lowercase + collapse whitespace: the canonical search form. */
export function toSearchKey(input: string): string {
  return normalizeArabic(input).toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Split a string into searchable tokens. */
export function tokenize(input: string): string[] {
  const key = toSearchKey(input);
  if (!key) return [];
  return key.split(' ').filter(Boolean);
}

/** Remove diacritics for display in compact contexts (chips, labels). */
export function stripTashkeel(input: string): string {
  return input ? input.replace(DIACRITICS, '') : '';
}

export function containsArabic(input: string): boolean {
  return ARABIC_LETTER.test(input ?? '');
}

/**
 * Arabic-aware pluralisation used by counters ("٣ أذكار", "ذكر واحد", ...).
 * `few` = 3–10, `many` = 11+.
 */
export function arabicCount(count: number, forms: { one: string; two: string; few: string; many: string }): string {
  if (count === 1) return forms.one;
  if (count === 2) return forms.two;
  if (count % 100 >= 3 && count % 100 <= 10) return `${count} ${forms.few}`;
  return `${count} ${forms.many}`;
}

/**
 * Convert Western digits to Arabic-Indic. Used only where the design calls for
 * it — counters stay in Western digits because they are tabular and clearer.
 */
export function toArabicDigits(input: string | number): string {
  const map = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(input).replace(/[0-9]/g, (digit) => map[Number(digit)]);
}

/**
 * Word-wrap long Arabic text into lines of at most `maxChars`.
 * Needed for the share card, where SVG has no automatic wrapping.
 */
export function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}
