/**
 * Quran API utilities for fetching verse text.
 * Uses the AlQuran.cloud API.
 */

export interface QuranVerse {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  page: number;
  surah: {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
  };
}

export interface QuranSurah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

/**
 * Fetch a single verse from the Quran.
 * @param surah - Surah number (1-114)
 * @param ayah - Ayah number within the surah
 * @returns The verse data or null if not found
 */
export async function fetchVerse(
  surah: number,
  ayah: number
): Promise<QuranVerse | null> {
  try {
    const res = await fetch(
      `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}`
    );
    if (!res.ok) {
      console.error("Failed to fetch verse:", res.status);
      return null;
    }
    const data = await res.json();
    if (data.code !== 200 || !data.data) {
      return null;
    }
    return data.data as QuranVerse;
  } catch (error) {
    console.error("Error fetching verse:", error);
    return null;
  }
}

/**
 * Fetch a range of verses from the Quran.
 * @param surah - Surah number (1-114)
 * @param startAyah - Starting ayah number
 * @param endAyah - Ending ayah number
 * @returns Array of verses or empty array if failed
 */
export async function fetchVerseRange(
  surah: number,
  startAyah: number,
  endAyah: number
): Promise<QuranVerse[]> {
  try {
    const verses: QuranVerse[] = [];

    // Fetch each verse in the range
    for (let ayah = startAyah; ayah <= endAyah; ayah++) {
      const verse = await fetchVerse(surah, ayah);
      if (verse) {
        verses.push(verse);
      }
    }

    return verses;
  } catch (error) {
    console.error("Error fetching verse range:", error);
    return [];
  }
}

/**
 * Fetch entire surah metadata (no verses).
 * @param surah - Surah number (1-114)
 */
export async function fetchSurahInfo(
  surah: number
): Promise<QuranSurah | null> {
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${surah}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.code !== 200 || !data.data) return null;

    return {
      number: data.data.number,
      name: data.data.name,
      englishName: data.data.englishName,
      englishNameTranslation: data.data.englishNameTranslation,
      numberOfAyahs: data.data.numberOfAyahs,
      revelationType: data.data.revelationType,
    };
  } catch (error) {
    console.error("Error fetching surah info:", error);
    return null;
  }
}

/**
 * Fetch list of all surahs (metadata only).
 */
export async function fetchAllSurahs(): Promise<QuranSurah[]> {
  try {
    const res = await fetch("https://api.alquran.cloud/v1/surah");
    if (!res.ok) return [];

    const data = await res.json();
    if (data.code !== 200 || !data.data) return [];

    return data.data.map((s: QuranSurah) => ({
      number: s.number,
      name: s.name,
      englishName: s.englishName,
      englishNameTranslation: s.englishNameTranslation,
      numberOfAyahs: s.numberOfAyahs,
      revelationType: s.revelationType,
    }));
  } catch (error) {
    console.error("Error fetching surahs:", error);
    return [];
  }
}

/**
 * Format verse reference string.
 */
export function formatVerseRef(
  surah: number,
  ayahStart: number,
  ayahEnd?: number
): string {
  if (ayahEnd && ayahEnd !== ayahStart) {
    return `${surah}:${ayahStart}-${ayahEnd}`;
  }
  return `${surah}:${ayahStart}`;
}

/**
 * Parse verse reference string.
 * Supports formats: "2:255", "2:1-5"
 */
export function parseVerseRef(ref: string): {
  surah: number;
  ayahStart: number;
  ayahEnd?: number;
} | null {
  const match = ref.match(/^(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;

  const surah = parseInt(match[1], 10);
  const ayahStart = parseInt(match[2], 10);
  const ayahEnd = match[3] ? parseInt(match[3], 10) : undefined;

  if (surah < 1 || surah > 114) return null;
  if (ayahStart < 1) return null;
  if (ayahEnd !== undefined && ayahEnd < ayahStart) return null;

  return { surah, ayahStart, ayahEnd };
}
