/**
 * Quran Foundation API client for fetching translations.
 * Uses the Quran Foundation API with OAuth2 authentication.
 */

export interface TranslationSource {
  id: string;
  name: string;
  authorName: string;
}

export interface AyahTranslation {
  ayahNumber: number;
  text: string;
  sourceId: string;
  sourceName: string;
}

export interface FetchedAyah {
  ayahNumber: number;
  arabicText: string;
  translations: AyahTranslation[];
}

// Default translations (enabled by default when adding verses)
export const DEFAULT_TRANSLATIONS: TranslationSource[] = [
  {
    id: "131",
    name: "Sahih International",
    authorName: "Saheeh International",
  },
  {
    id: "149",
    name: "The Clear Quran",
    authorName: "Dr. Mustafa Khattab",
  },
];

// All available translations for selection
export const AVAILABLE_TRANSLATIONS: TranslationSource[] = [
  ...DEFAULT_TRANSLATIONS,
  { id: "20", name: "Pickthall", authorName: "Muhammad Marmaduke Pickthall" },
  { id: "22", name: "Yusuf Ali", authorName: "Abdullah Yusuf Ali" },
  { id: "84", name: "Mufti Taqi Usmani", authorName: "Mufti Taqi Usmani" },
  { id: "85", name: "Abdul Haleem", authorName: "Abdul Haleem" },
];

/**
 * Fetch a translation for a specific ayah from the Quran Foundation API.
 * This calls our internal API route which handles authentication.
 * @param surah - Surah number (1-114)
 * @param ayah - Ayah number
 * @param resourceId - Translation resource ID (e.g., "131" for Sahih International)
 * @returns Translation text or null if failed
 */
export async function fetchTranslation(
  surah: number,
  ayah: number,
  resourceId: string
): Promise<string | null> {
  try {
    const ayahKey = `${surah}:${ayah}`;
    const response = await fetch(
      `/api/quran/translation?resourceId=${resourceId}&ayahKey=${ayahKey}`
    );

    if (!response.ok) {
      console.error("Failed to fetch translation:", response.status);
      return null;
    }

    const data = await response.json();
    return data.text ?? null;
  } catch (error) {
    console.error("Error fetching translation:", error);
    return null;
  }
}

/**
 * Fetch translations for a range of ayahs.
 * @param surah - Surah number
 * @param ayahStart - Starting ayah number
 * @param ayahEnd - Ending ayah number
 * @param resourceIds - Array of translation resource IDs to fetch
 * @returns Map of ayah numbers to their translations
 */
export async function fetchTranslationsForRange(
  surah: number,
  ayahStart: number,
  ayahEnd: number,
  resourceIds: string[]
): Promise<Map<number, AyahTranslation[]>> {
  const results = new Map<number, AyahTranslation[]>();

  for (let ayah = ayahStart; ayah <= ayahEnd; ayah++) {
    const translations: AyahTranslation[] = [];

    for (const resourceId of resourceIds) {
      const source = AVAILABLE_TRANSLATIONS.find((t) => t.id === resourceId);
      const text = await fetchTranslation(surah, ayah, resourceId);

      if (text && source) {
        translations.push({
          ayahNumber: ayah,
          text,
          sourceId: resourceId,
          sourceName: source.name,
        });
      }
    }

    results.set(ayah, translations);
  }

  return results;
}

/**
 * Get translation source by ID.
 */
export function getTranslationSource(id: string): TranslationSource | undefined {
  return AVAILABLE_TRANSLATIONS.find((t) => t.id === id);
}

/**
 * Check if a translation ID is one of the defaults.
 */
export function isDefaultTranslation(id: string): boolean {
  return DEFAULT_TRANSLATIONS.some((t) => t.id === id);
}
