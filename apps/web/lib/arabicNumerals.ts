/**
 * Arabic-Indic numeral utilities for Quran verse display.
 */

// Arabic-Indic numerals (٠ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩)
const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/**
 * Convert a number to Arabic-Indic numerals.
 * @param num - The number to convert
 * @returns The number in Arabic-Indic numerals (e.g., 123 → "١٢٣")
 */
export function toArabicNumerals(num: number): string {
  return num
    .toString()
    .split("")
    .map((digit) => ARABIC_DIGITS[parseInt(digit)] ?? digit)
    .join("");
}

/**
 * Format ayah number with ornate Quran brackets.
 * Uses the ornamental parentheses: ﴿ (U+FD3F) and ﴾ (U+FD3E)
 * @param ayahNumber - The ayah number
 * @returns Formatted string like "﴿١﴾"
 */
export function formatAyahNumber(ayahNumber: number): string {
  const arabicNum = toArabicNumerals(ayahNumber);
  return `﴿${arabicNum}﴾`;
}

/**
 * Format Arabic text with ayah numbers inline.
 * Creates continuous text flow with numbers at the end of each ayah.
 * @param ayahs - Array of ayahs with their numbers and text
 * @returns Formatted string like "بسم الله ﴿١﴾ الحمد لله ﴿٢﴾"
 */
export function formatArabicWithAyahNumbers(
  ayahs: Array<{ ayahNumber: number; arabicText: string }>
): string {
  return ayahs
    .map((ayah) => `${ayah.arabicText} ${formatAyahNumber(ayah.ayahNumber)}`)
    .join(" ");
}
