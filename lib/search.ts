/**
 * Client-side search utilities for the Arabic Knowledge Retention System.
 *
 * Search algorithm:
 * 1. Detect language (Arabic vs Latin)
 * 2. Arabic: exact/substring on stripped text (diacritic-insensitive)
 * 3. Latin: check if root pattern (c-c-c), else fuzzy on meanings/translations
 * 4. Apply type filters
 * 5. Rank: exact > prefix > contains > fuzzy
 */

import { stripDiacritics, containsArabic } from "./arabic";

export type EntityType =
  | "word"
  | "verse"
  | "hadith"
  | "root"
  | "course"
  | "lesson"
  | "book"
  | "chapter"
  | "note"
  | "tag";

export interface SearchResult {
  type: EntityType;
  id: string;
  displayText: string;
  subtitle?: string;
  score: number;
  matchType: "exact" | "prefix" | "contains" | "fuzzy";
}

export interface SearchFilters {
  types?: EntityType[];
  rootPattern?: boolean;
  exactMatch?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SearchData = Record<string, any[]>;

/**
 * Detect if query looks like a root pattern (e.g., "k-t-b" or "ktb")
 */
function isRootPattern(query: string): boolean {
  // Match patterns like "k-t-b" or "ktb" (2-4 consonants)
  const dashed = /^[a-z]-[a-z]-[a-z](-[a-z])?$/i.test(query);
  const compact = /^[a-z]{2,4}$/i.test(query) && !/[aeiou]{2}/i.test(query);
  return dashed || compact;
}

/**
 * Calculate fuzzy match score using Levenshtein distance
 */
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t === q) return 1;
  if (t.startsWith(q)) return 0.9;
  if (t.includes(q)) return 0.7;

  // Simple fuzzy: count matching characters in order
  let matchCount = 0;
  let targetIdx = 0;
  for (const char of q) {
    const foundIdx = t.indexOf(char, targetIdx);
    if (foundIdx >= 0) {
      matchCount++;
      targetIdx = foundIdx + 1;
    }
  }

  return matchCount / q.length * 0.5;
}

/**
 * Search words
 */
function searchWords(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  words: any[],
  query: string,
  isArabic: boolean
): SearchResult[] {
  const results: SearchResult[] = [];
  const strippedQuery = stripDiacritics(query);

  for (const word of words) {
    let score = 0;
    let matchType: SearchResult["matchType"] = "fuzzy";

    if (isArabic) {
      // Search Arabic text
      const strippedText = word.diacriticStrippedText || stripDiacritics(word.text);

      if (strippedText === strippedQuery) {
        score = 1;
        matchType = "exact";
      } else if (strippedText.startsWith(strippedQuery)) {
        score = 0.9;
        matchType = "prefix";
      } else if (strippedText.includes(strippedQuery)) {
        score = 0.7;
        matchType = "contains";
      } else if (word.text.includes(query)) {
        // Exact match with diacritics
        score = 0.95;
        matchType = "exact";
      }
    } else {
      // Search transliteration and meanings
      const translitMatch = word.transliteration
        ? fuzzyScore(query, word.transliteration)
        : 0;

      const meaningMatch = Math.max(
        ...word.meanings.map((m: { definition: string }) =>
          fuzzyScore(query, m.definition)
        ),
        0
      );

      score = Math.max(translitMatch, meaningMatch);
      if (score >= 1) matchType = "exact";
      else if (score >= 0.9) matchType = "prefix";
      else if (score >= 0.7) matchType = "contains";
    }

    if (score > 0.3) {
      results.push({
        type: "word",
        id: word._id,
        displayText: word.text,
        subtitle: word.meanings[0]?.definition,
        score,
        matchType,
      });
    }
  }

  return results;
}

/**
 * Search roots
 */
function searchRoots(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  roots: any[],
  query: string,
  isArabic: boolean,
  isRoot: boolean
): SearchResult[] {
  const results: SearchResult[] = [];

  for (const root of roots) {
    let score = 0;
    let matchType: SearchResult["matchType"] = "fuzzy";

    if (isArabic) {
      const strippedQuery = stripDiacritics(query);
      if (root.letters === strippedQuery) {
        score = 1;
        matchType = "exact";
      } else if (root.letters.includes(strippedQuery)) {
        score = 0.7;
        matchType = "contains";
      }
    } else if (isRoot) {
      // Normalize root pattern query
      const normalizedQuery = query.toLowerCase().replace(/-/g, "");
      const normalizedLatinized = root.latinized.toLowerCase().replace(/-/g, "");

      if (normalizedLatinized === normalizedQuery) {
        score = 1;
        matchType = "exact";
      } else if (normalizedLatinized.includes(normalizedQuery)) {
        score = 0.7;
        matchType = "contains";
      }
    } else {
      // Search meaning
      score = fuzzyScore(query, root.coreMeaning);
      if (score >= 1) matchType = "exact";
      else if (score >= 0.9) matchType = "prefix";
      else if (score >= 0.7) matchType = "contains";
    }

    if (score > 0.3) {
      results.push({
        type: "root",
        id: root._id,
        displayText: root.letters,
        subtitle: `${root.latinized} - ${root.coreMeaning}`,
        score,
        matchType,
      });
    }
  }

  return results;
}

/**
 * Search verses
 */
function searchVerses(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verses: any[],
  query: string,
  isArabic: boolean
): SearchResult[] {
  const results: SearchResult[] = [];

  for (const verse of verses) {
    let score = 0;
    let matchType: SearchResult["matchType"] = "fuzzy";
    const ref = `${verse.surahNumber}:${verse.ayahStart}${
      verse.ayahEnd ? `-${verse.ayahEnd}` : ""
    }`;

    if (isArabic) {
      const strippedQuery = stripDiacritics(query);
      const strippedText =
        verse.diacriticStrippedText || stripDiacritics(verse.arabicText);

      if (strippedText.includes(strippedQuery)) {
        score = 0.8;
        matchType = "contains";
      } else if (verse.arabicText.includes(query)) {
        score = 0.85;
        matchType = "contains";
      }
    } else {
      // Search verse reference (e.g., "2:255" or "baqara")
      if (ref.includes(query)) {
        score = 0.9;
        matchType = "prefix";
      } else if (verse.topic?.toLowerCase().includes(query.toLowerCase())) {
        score = 0.7;
        matchType = "contains";
      } else if (verse.translation?.toLowerCase().includes(query.toLowerCase())) {
        score = 0.6;
        matchType = "contains";
      }
    }

    if (score > 0.3) {
      results.push({
        type: "verse",
        id: verse._id,
        displayText: ref,
        subtitle: verse.arabicText.slice(0, 60) + "...",
        score,
        matchType,
      });
    }
  }

  return results;
}

/**
 * Search hadiths
 */
function searchHadiths(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hadiths: any[],
  query: string,
  isArabic: boolean
): SearchResult[] {
  const results: SearchResult[] = [];

  for (const hadith of hadiths) {
    let score = 0;
    let matchType: SearchResult["matchType"] = "fuzzy";
    const ref = `${hadith.collection} #${hadith.hadithNumber}`;

    if (isArabic) {
      const strippedQuery = stripDiacritics(query);
      const strippedText =
        hadith.diacriticStrippedText || stripDiacritics(hadith.arabicText);

      if (strippedText.includes(strippedQuery)) {
        score = 0.8;
        matchType = "contains";
      }
    } else {
      // Search collection, number, topic
      if (
        hadith.collection.toLowerCase().includes(query.toLowerCase()) ||
        hadith.hadithNumber.includes(query)
      ) {
        score = 0.9;
        matchType = "prefix";
      } else if (hadith.topic?.toLowerCase().includes(query.toLowerCase())) {
        score = 0.7;
        matchType = "contains";
      }
    }

    if (score > 0.3) {
      results.push({
        type: "hadith",
        id: hadith._id,
        displayText: ref,
        subtitle: hadith.arabicText.slice(0, 60) + "...",
        score,
        matchType,
      });
    }
  }

  return results;
}

/**
 * Search notes
 */
function searchNotes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  notes: any[],
  query: string
): SearchResult[] {
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  for (const note of notes) {
    let score = 0;
    let matchType: SearchResult["matchType"] = "fuzzy";

    const title = note.title?.toLowerCase() || "";
    const content = note.content?.toLowerCase() || "";

    if (title.includes(lowerQuery)) {
      score = title === lowerQuery ? 1 : 0.8;
      matchType = title === lowerQuery ? "exact" : "contains";
    } else if (content.includes(lowerQuery)) {
      score = 0.6;
      matchType = "contains";
    }

    if (score > 0.3) {
      results.push({
        type: "note",
        id: note._id,
        displayText: note.title || "Untitled Note",
        subtitle: note.content?.slice(0, 60) + "...",
        score,
        matchType,
      });
    }
  }

  return results;
}

/**
 * Search courses and lessons
 */
function searchCourses(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  courses: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lessons: any[],
  query: string
): SearchResult[] {
  const results: SearchResult[] = [];

  for (const course of courses) {
    const score = fuzzyScore(query, course.title);
    if (score > 0.3) {
      results.push({
        type: "course",
        id: course._id,
        displayText: course.title,
        subtitle: course.description,
        score,
        matchType: score >= 1 ? "exact" : score >= 0.7 ? "contains" : "fuzzy",
      });
    }
  }

  for (const lesson of lessons) {
    const score = fuzzyScore(query, lesson.title);
    if (score > 0.3) {
      results.push({
        type: "lesson",
        id: lesson._id,
        displayText: lesson.title,
        score,
        matchType: score >= 1 ? "exact" : score >= 0.7 ? "contains" : "fuzzy",
      });
    }
  }

  return results;
}

/**
 * Search books and chapters
 */
function searchBooks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  books: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chapters: any[],
  query: string
): SearchResult[] {
  const results: SearchResult[] = [];

  for (const book of books) {
    const titleScore = fuzzyScore(query, book.title);
    const authorScore = book.author ? fuzzyScore(query, book.author) : 0;
    const score = Math.max(titleScore, authorScore * 0.8);

    if (score > 0.3) {
      results.push({
        type: "book",
        id: book._id,
        displayText: book.title,
        subtitle: book.author,
        score,
        matchType: score >= 1 ? "exact" : score >= 0.7 ? "contains" : "fuzzy",
      });
    }
  }

  for (const chapter of chapters) {
    const score = fuzzyScore(query, chapter.title);
    if (score > 0.3) {
      results.push({
        type: "chapter",
        id: chapter._id,
        displayText: chapter.title,
        score,
        matchType: score >= 1 ? "exact" : score >= 0.7 ? "contains" : "fuzzy",
      });
    }
  }

  return results;
}

/**
 * Search tags
 */
function searchTags(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tags: any[],
  query: string
): SearchResult[] {
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  for (const tag of tags) {
    const name = tag.name.toLowerCase();
    let score = 0;
    let matchType: SearchResult["matchType"] = "fuzzy";

    if (name === lowerQuery) {
      score = 1;
      matchType = "exact";
    } else if (name.startsWith(lowerQuery)) {
      score = 0.9;
      matchType = "prefix";
    } else if (name.includes(lowerQuery)) {
      score = 0.7;
      matchType = "contains";
    }

    if (score > 0.3) {
      results.push({
        type: "tag",
        id: tag._id,
        displayText: tag.name,
        score,
        matchType,
      });
    }
  }

  return results;
}

/**
 * Main search function.
 * Searches all entity types and returns ranked results.
 */
export function searchEntities(
  query: string,
  data: SearchData,
  filters?: SearchFilters
): SearchResult[] {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const trimmedQuery = query.trim();
  const isArabic = containsArabic(trimmedQuery);
  const isRoot = !isArabic && isRootPattern(trimmedQuery);

  const allowedTypes = filters?.types || [
    "word",
    "verse",
    "hadith",
    "root",
    "course",
    "lesson",
    "book",
    "chapter",
    "note",
    "tag",
  ];

  const results: SearchResult[] = [];

  // Search each entity type
  if (allowedTypes.includes("word") && data.words) {
    results.push(...searchWords(data.words, trimmedQuery, isArabic));
  }

  if (allowedTypes.includes("root") && data.roots) {
    results.push(...searchRoots(data.roots, trimmedQuery, isArabic, isRoot));
  }

  if (allowedTypes.includes("verse") && data.verses) {
    results.push(...searchVerses(data.verses, trimmedQuery, isArabic));
  }

  if (allowedTypes.includes("hadith") && data.hadiths) {
    results.push(...searchHadiths(data.hadiths, trimmedQuery, isArabic));
  }

  if (allowedTypes.includes("note") && data.notes) {
    results.push(...searchNotes(data.notes, trimmedQuery));
  }

  if (
    (allowedTypes.includes("course") || allowedTypes.includes("lesson")) &&
    (data.courses || data.lessons)
  ) {
    results.push(
      ...searchCourses(
        allowedTypes.includes("course") ? data.courses || [] : [],
        allowedTypes.includes("lesson") ? data.lessons || [] : [],
        trimmedQuery
      )
    );
  }

  if (
    (allowedTypes.includes("book") || allowedTypes.includes("chapter")) &&
    (data.books || data.chapters)
  ) {
    results.push(
      ...searchBooks(
        allowedTypes.includes("book") ? data.books || [] : [],
        allowedTypes.includes("chapter") ? data.chapters || [] : [],
        trimmedQuery
      )
    );
  }

  if (allowedTypes.includes("tag") && data.tags) {
    results.push(...searchTags(data.tags, trimmedQuery));
  }

  // Sort by score (descending)
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Group search results by type
 */
export function groupResultsByType(
  results: SearchResult[]
): Record<EntityType, SearchResult[]> {
  const grouped: Record<EntityType, SearchResult[]> = {
    word: [],
    verse: [],
    hadith: [],
    root: [],
    course: [],
    lesson: [],
    book: [],
    chapter: [],
    note: [],
    tag: [],
  };

  for (const result of results) {
    grouped[result.type].push(result);
  }

  return grouped;
}
