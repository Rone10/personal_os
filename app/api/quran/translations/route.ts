import { NextResponse } from "next/server";

/**
 * API route to fetch available translations from the Quran Foundation API.
 * Useful for getting the correct resource IDs.
 */

// Cache for access token
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const clientId = process.env.QURAN_FOUNDATION_CLIENT_ID || process.env.Client_ID;
  const clientSecret = process.env.QURAN_FOUNDATION_CLIENT_SECRET || process.env.QURAN_FOUNDATION_API_TOKEN || process.env.Client_Secret;
  const oauthUrl = process.env.QURAN_FOUNDATION_OAUTH_URL || process.env.End_Point || "https://oauth2.quran.foundation";

  if (!clientId || !clientSecret) {
    return null;
  }

  try {
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
      return null;
    }

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
    return cachedToken;
  } catch {
    return null;
  }
}

export async function GET() {
  const clientId = process.env.QURAN_FOUNDATION_CLIENT_ID || process.env.Client_ID;
  if (!clientId) {
    return NextResponse.json({ error: "API credentials not configured" }, { status: 500 });
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Failed to authenticate" }, { status: 500 });
  }

  try {
    const apiBaseUrl = process.env.QURAN_FOUNDATION_API_URL || "https://apis.quran.foundation";

    // Fetch available translations (English only for now)
    const response = await fetch(`${apiBaseUrl}/content/api/v4/resources/translations?language=en`, {
      headers: {
        Accept: "application/json",
        "x-auth-token": accessToken,
        "x-client-id": clientId,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: "Failed to fetch translations", details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
