/**
 * Arabic normalization helpers for Study Center search.
 *
 * Goals:
 * - Make matching diacritics-insensitive (remove harakat/tashkeel).
 * - Remove tatweel (kashida).
 * - Normalize common letter variants so user input matches saved text consistently.
 *
 * Important: Keep this logic in sync with `./lib/arabic.ts` on the frontend.
 */

const ARABIC_DIACRITICS =
  /[\u064B-\u065F\u0670\u06D6-\u06ED]/g; // harakat + Quranic annotation marks

export function normalizeArabic(input: string): string {
  return (
    input
      .trim()
      // Remove diacritics / Quranic marks.
      .replace(ARABIC_DIACRITICS, "")
      // Remove tatweel/kashida.
      .replace(/\u0640/g, "")
      // Normalize Alif variants to bare Alif.
      .replace(/[إأآٱ]/g, "ا")
      // Normalize Ya/Alif Maqsura to Ya.
      .replace(/[ى]/g, "ي")
      // Normalize Ta marbuta to Ha (common search behavior).
      .replace(/[ة]/g, "ه")
      // Normalize hamza-on-waw/ya to hamza (keeps intent, reduces variants).
      .replace(/[ؤئ]/g, "ء")
      // Collapse whitespace.
      .replace(/\s+/g, " ")
  );
}

