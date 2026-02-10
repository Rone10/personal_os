import { NextResponse } from "next/server";
import { getQuranClient } from "@/lib/quranClient";

/**
 * API route to fetch available translations using the Quran Foundation SDK.
 */
export async function GET() {
  try {
    const client = getQuranClient();

    // Fetch all available translations
    const translations = await client.resources.findAllTranslations();

    // Filter to English translations
    const englishTranslations = translations.filter(
      (t) => t.languageName === "english"
    );

    return NextResponse.json({
      translations: englishTranslations,
      all: translations,
    });
  } catch (error) {
    console.error("Error fetching translations:", error);
    return NextResponse.json(
      { error: "Failed to fetch translations", details: String(error) },
      { status: 500 }
    );
  }
}
