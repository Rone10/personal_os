/**
 * Arabic normalization helpers for Study Center search.
 *
 * Keep in sync with `./convex/_lib/arabic.ts`.
 */

const ARABIC_DIACRITICS =
  /[\u064B-\u065F\u0670\u06D6-\u06ED]/g; // harakat + Quranic annotation marks

export function normalizeArabic(input: string): string {
  return (
    input
      .trim()
      .replace(ARABIC_DIACRITICS, "")
      .replace(/\u0640/g, "") // tatweel/kashida
      .replace(/[إأآٱ]/g, "ا")
      .replace(/[ى]/g, "ي")
      .replace(/[ة]/g, "ه")
      .replace(/[ؤئ]/g, "ء")
      .replace(/\s+/g, " ")
  );
}

export function containsArabic(input: string): boolean {
  return /[\u0600-\u06FF]/.test(input);
}

