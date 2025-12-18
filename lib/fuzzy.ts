/**
 * Tiny fuzzy matching utilities (no external dependency).
 *
 * We use this for English search over saved meaning texts and source titles.
 * It’s intentionally simple: substring match is best, otherwise subsequence
 * matching over tokens.
 */

function subsequenceScore(needle: string, haystack: string): number {
  let i = 0;
  let j = 0;
  let gaps = 0;

  while (i < needle.length && j < haystack.length) {
    if (needle[i] === haystack[j]) {
      i += 1;
    } else {
      gaps += 1;
    }
    j += 1;
  }

  if (i !== needle.length) return 0;
  const density = needle.length / Math.max(1, j); // earlier match => better
  const gapPenalty = 1 / (1 + gaps / 8);
  return density * gapPenalty;
}

export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = text.toLowerCase();

  if (t.includes(q)) return 1;

  const tokens = q.split(/\s+/g).filter(Boolean);
  if (tokens.length === 0) return 0;

  const scores = tokens.map((token) => {
    if (t.includes(token)) return 0.9;
    return subsequenceScore(token, t);
  });

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.max(0, Math.min(1, avg));
}

