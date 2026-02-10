/**
 * Quran Foundation API client using the official SDK.
 * Handles authentication automatically.
 */

import { QuranClient, Language } from "@quranjs/api";

let client: QuranClient | null = null;

/**
 * Get a singleton instance of the QuranClient.
 * The client handles OAuth2 token management automatically.
 */
export function getQuranClient(): QuranClient {
  if (!client) {
    const clientId = process.env.QURAN_CLIENT_ID;
    const clientSecret = process.env.QURAN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        "QURAN_CLIENT_ID and QURAN_CLIENT_SECRET must be set in environment variables"
      );
    }

    client = new QuranClient({
      clientId,
      clientSecret,
      defaults: {
        language: Language.ENGLISH,
      },
    });
  }

  return client;
}

/**
 * Clear the cached client (useful if credentials change).
 */
export function clearQuranClient(): void {
  if (client) {
    client.clearCachedToken();
    client = null;
  }
}
