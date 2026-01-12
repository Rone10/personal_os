import { NextRequest, NextResponse } from "next/server";
import { getQuranClient } from "@/lib/quranClient";
import { isValidVerseKey } from "@quranjs/api";

/**
 * API route to fetch verse translations using the Quran Foundation SDK.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const resourceId = searchParams.get("resourceId");
  const ayahKey = searchParams.get("ayahKey"); // e.g., "2:255"

  if (!resourceId || !ayahKey) {
    return NextResponse.json(
      { error: "Missing resourceId or ayahKey parameter" },
      { status: 400 }
    );
  }

  // Validate the verse key format
  if (!isValidVerseKey(ayahKey)) {
    return NextResponse.json(
      { error: "Invalid ayahKey format. Expected format: chapter:verse (e.g., 2:255)" },
      { status: 400 }
    );
  }

  try {
    const client = getQuranClient();

    // Fetch the verse with the specified translation
    const verse = await client.verses.findByKey(ayahKey, {
      translations: [parseInt(resourceId)],
    });

    // Extract the translation text
    const text = verse.translations?.[0]?.text ?? null;

    return NextResponse.json({
      text,
      raw: verse,
    });
  } catch (error) {
    console.error("Error fetching translation:", error);
    return NextResponse.json(
      { error: "Failed to fetch translation", details: String(error) },
      { status: 500 }
    );
  }
}
