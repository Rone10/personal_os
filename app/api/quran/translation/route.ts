import { NextRequest, NextResponse } from "next/server";

/**
 * API route to proxy translation requests to the Quran Foundation API.
 * This keeps the API credentials secure on the server side.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const resourceId = searchParams.get("resourceId");
  const ayahKey = searchParams.get("ayahKey");

  if (!resourceId || !ayahKey) {
    return NextResponse.json(
      { error: "Missing resourceId or ayahKey parameter" },
      { status: 400 }
    );
  }

  const apiToken = process.env.QURAN_FOUNDATION_API_TOKEN;
  const clientId = process.env.QURAN_FOUNDATION_CLIENT_ID;

  if (!apiToken || !clientId) {
    return NextResponse.json(
      { error: "Quran Foundation API credentials not configured" },
      { status: 500 }
    );
  }

  try {
    const apiUrl = `https://apis-prelive.quran.foundation/content/api/v4/translations/${resourceId}/by_ayah/${ayahKey}`;

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "x-auth-token": apiToken,
        "x-client-id": clientId,
      },
    });

    if (!response.ok) {
      console.error(
        "Quran Foundation API error:",
        response.status,
        await response.text()
      );
      return NextResponse.json(
        { error: "Failed to fetch translation from API" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract the translation text from the response
    // The exact structure may vary - adjust based on actual API response
    const text = data?.translation?.text || data?.text || null;

    return NextResponse.json({ text, raw: data });
  } catch (error) {
    console.error("Error fetching from Quran Foundation API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
