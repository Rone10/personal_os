import { NextRequest, NextResponse } from "next/server";

/**
 * API route to proxy translation requests to the Quran Foundation API.
 * Handles OAuth2 token acquisition and caching.
 */

// Cache for access token
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get an OAuth2 access token from Quran Foundation.
 * Caches the token until it expires (1 hour).
 */
async function getAccessToken(): Promise<string | null> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  // Use the variable names from .env.local
  const clientId = process.env.QURAN_FOUNDATION_CLIENT_ID || process.env.Client_ID;
  const clientSecret = process.env.QURAN_FOUNDATION_CLIENT_SECRET || process.env.QURAN_FOUNDATION_API_TOKEN || process.env.Client_Secret;
  // Default to production endpoint
  const oauthUrl = process.env.QURAN_FOUNDATION_OAUTH_URL || process.env.End_Point || "https://oauth2.quran.foundation";

  if (!clientId || !clientSecret) {
    console.error("Quran Foundation credentials not configured");
    return null;
  }

  try {
    // Create Basic auth header (clientId:clientSecret)
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(`${oauthUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=content",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to get access token:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    cachedToken = data.access_token;
    // Set expiry (expires_in is in seconds, default 3600 = 1 hour)
    tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;

    console.log("Got new access token, expires in:", data.expires_in, "seconds");
    return cachedToken;
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
}

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

  const clientId = process.env.QURAN_FOUNDATION_CLIENT_ID || process.env.Client_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Quran Foundation API credentials not configured" },
      { status: 500 }
    );
  }

  // Get access token (handles caching and refresh)
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to authenticate with Quran Foundation API" },
      { status: 500 }
    );
  }

  try {
    // Default to production API URL
    const apiBaseUrl = process.env.QURAN_FOUNDATION_API_URL || "https://apis.quran.foundation";
    const apiUrl = `${apiBaseUrl}/content/api/v4/translations/${resourceId}/by_ayah/${ayahKey}`;

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "x-auth-token": accessToken,
        "x-client-id": clientId,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Quran Foundation API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to fetch translation from API", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract the translation text from the response
    // The API returns: { translations: [{ text: "..." }] }
    const text = data?.translations?.[0]?.text || data?.translation?.text || null;

    return NextResponse.json({ text, raw: data });
  } catch (error) {
    console.error("Error fetching from Quran Foundation API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
