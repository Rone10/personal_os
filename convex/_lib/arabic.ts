/**
 * Arabic normalization helpers for the Arabic Knowledge Retention System.
 *
 * Two normalization levels:
 * 1. normalizeArabic() - For `normalizedText`: Removes tatweel, preserves alef/hamza
 * 2. stripDiacritics() - For `diacriticStrippedText`: Removes tashkeel for fuzzy matching
 *
 * Key difference from previous implementation:
 * - Alef/hamza variants (أ إ آ ا) are PRESERVED, not normalized
 * - This allows distinguishing between different alef forms in exact search
 *
 * Keep this logic in sync with `./lib/arabic.ts` on the frontend.
 */

// Harakat (vowel marks) + Quranic annotation marks
const ARABIC_DIACRITICS =
  /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

// Tatweel/kashida (stretching character)
const TATWEEL = /\u0640/g;

/**
 * Normalize Arabic text for exact matching.
 * - Removes tatweel (kashida)
 * - PRESERVES alef/hamza variants (أ إ آ ا remain distinct)
 * - Collapses whitespace
 *
 * Use this for `normalizedText` field.
 */
export function normalizeArabic(input: string): string {
  return input
    .trim()
    // Remove tatweel/kashida only
    .replace(TATWEEL, "")
    // Collapse whitespace
    .replace(/\s+/g, " ");
}

/**
 * Strip diacritics (tashkeel) for fuzzy matching.
 * - Removes all vowel marks and Quranic annotations
 * - Removes tatweel
 * - PRESERVES alef/hamza variants
 * - Collapses whitespace
 *
 * Use this for `diacriticStrippedText` field.
 */
export function stripDiacritics(input: string): string {
  return input
    .trim()
    // Remove diacritics (harakat, tashkeel)
    .replace(ARABIC_DIACRITICS, "")
    // Remove tatweel
    .replace(TATWEEL, "")
    // Collapse whitespace
    .replace(/\s+/g, " ");
}

/**
 * Tokenize Arabic text for search indexing.
 * Splits on whitespace and punctuation, returns unique lowercase tokens.
 */
export function tokenizeArabic(input: string): string[] {
  const stripped = stripDiacritics(input);
  // Split on whitespace and common punctuation
  const tokens = stripped.split(/[\s,.;:!?،؛؟\-()[\]{}]+/);
  // Filter empty strings and return unique tokens
  const unique = [...new Set(tokens.filter((t) => t.length > 0))];
  return unique;
}

/**
 * Check if a string contains Arabic characters.
 */
export function containsArabic(input: string): boolean {
  return /[\u0600-\u06FF]/.test(input);
}

/**
 * Extract snippet around a position in text.
 * Used for backlink context display.
 */
export function extractSnippet(
  text: string,
  startOffset: number,
  endOffset: number,
  contextChars: number = 50
): string {
  const snippetStart = Math.max(0, startOffset - contextChars);
  const snippetEnd = Math.min(text.length, endOffset + contextChars);

  let snippet = text.slice(snippetStart, snippetEnd);

  // Add ellipsis if truncated
  if (snippetStart > 0) snippet = "..." + snippet;
  if (snippetEnd < text.length) snippet = snippet + "...";

  return snippet;
}
