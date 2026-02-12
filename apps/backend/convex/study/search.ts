/**
 * Unified search for Study Center
 * Provides bulk data query for client-side search
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get all searchable data for client-side search.
 * Returns words, verses, hadiths, roots, notes, courses, topics, lessons, chapters.
 */
export const getSearchData = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        words: [],
        verses: [],
        hadiths: [],
        roots: [],
        notes: [],
        courses: [],
        lessons: [],
        topics: [],
        books: [],
        chapters: [],
        tags: [],
        collections: [],
      };
    }

    const userId = identity.subject;

    // Fetch all data in parallel
    const [
      words,
      verses,
      hadiths,
      roots,
      notes,
      courses,
      lessons,
      topics,
      books,
      chapters,
      tags,
      collections,
    ] = await Promise.all([
      ctx.db
        .query("words")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("verses")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("hadiths")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("roots")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("studyNotes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("courses")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("lessons")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("topics")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("books")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("chapters")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("tags")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("collections")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    ]);

    return {
      words,
      verses,
      hadiths,
      roots,
      notes,
      courses,
      lessons,
      topics,
      books,
      chapters,
      tags,
      collections,
    };
  },
});

/**
 * Quick search for entity picker (used in note linking).
 * Returns lightweight results for the link picker modal.
 */
export const quickSearch = query({
  args: {
    query: v.string(),
    entityTypes: v.optional(
      v.array(
        v.union(
          v.literal("word"),
          v.literal("verse"),
          v.literal("hadith"),
          v.literal("lesson"),
          v.literal("chapter"),
          v.literal("root")
        )
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;
    const searchQuery = args.query.toLowerCase().trim();
    const limit = args.limit ?? 10;
    const types = args.entityTypes ?? [
      "word",
      "verse",
      "hadith",
      "lesson",
      "chapter",
      "root",
    ];

    const results: Array<{
      type: string;
      id: string;
      displayText: string;
      subtitle?: string;
    }> = [];

    // Search each entity type
    if (types.includes("word")) {
      const words = await ctx.db
        .query("words")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      for (const word of words) {
        if (
          word.text.includes(searchQuery) ||
          word.diacriticStrippedText.includes(searchQuery) ||
          word.meanings.some((m) =>
            m.definition.toLowerCase().includes(searchQuery)
          )
        ) {
          results.push({
            type: "word",
            id: word._id,
            displayText: word.text,
            subtitle: word.meanings[0]?.definition,
          });
        }
        if (results.length >= limit) break;
      }
    }

    if (types.includes("verse") && results.length < limit) {
      const verses = await ctx.db
        .query("verses")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      for (const verse of verses) {
        const ref = `${verse.surahNumber}:${verse.ayahStart}${
          verse.ayahEnd ? `-${verse.ayahEnd}` : ""
        }`;
        if (
          verse.arabicText.includes(searchQuery) ||
          verse.diacriticStrippedText.includes(searchQuery) ||
          ref.includes(searchQuery)
        ) {
          results.push({
            type: "verse",
            id: verse._id,
            displayText: ref,
            subtitle: verse.arabicText.slice(0, 50) + "...",
          });
        }
        if (results.length >= limit) break;
      }
    }

    if (types.includes("hadith") && results.length < limit) {
      const hadiths = await ctx.db
        .query("hadiths")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      for (const hadith of hadiths) {
        const ref = `${hadith.collection} #${hadith.hadithNumber}`;
        if (
          hadith.arabicText.includes(searchQuery) ||
          hadith.diacriticStrippedText.includes(searchQuery) ||
          ref.toLowerCase().includes(searchQuery) ||
          hadith.collection.toLowerCase().includes(searchQuery)
        ) {
          results.push({
            type: "hadith",
            id: hadith._id,
            displayText: ref,
            subtitle: hadith.arabicText.slice(0, 50) + "...",
          });
        }
        if (results.length >= limit) break;
      }
    }

    if (types.includes("lesson") && results.length < limit) {
      const lessons = await ctx.db
        .query("lessons")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      for (const lesson of lessons) {
        if (lesson.title.toLowerCase().includes(searchQuery)) {
          results.push({
            type: "lesson",
            id: lesson._id,
            displayText: lesson.title,
          });
        }
        if (results.length >= limit) break;
      }
    }

    if (types.includes("chapter") && results.length < limit) {
      const chapters = await ctx.db
        .query("chapters")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      for (const chapter of chapters) {
        if (chapter.title.toLowerCase().includes(searchQuery)) {
          results.push({
            type: "chapter",
            id: chapter._id,
            displayText: chapter.title,
          });
        }
        if (results.length >= limit) break;
      }
    }

    if (types.includes("root") && results.length < limit) {
      const roots = await ctx.db
        .query("roots")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      for (const root of roots) {
        if (
          root.letters.includes(searchQuery) ||
          root.latinized.includes(searchQuery) ||
          root.coreMeaning.toLowerCase().includes(searchQuery)
        ) {
          results.push({
            type: "root",
            id: root._id,
            displayText: root.letters,
            subtitle: root.coreMeaning,
          });
        }
        if (results.length >= limit) break;
      }
    }

    return results.slice(0, limit);
  },
});

/**
 * Get recent items across all entity types.
 */
export const getRecentItems = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;
    const limit = args.limit ?? 10;

    // Fetch recent items from each type
    const [words, verses, hadiths, notes] = await Promise.all([
      ctx.db
        .query("words")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(limit),
      ctx.db
        .query("verses")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(limit),
      ctx.db
        .query("hadiths")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(limit),
      ctx.db
        .query("studyNotes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(limit),
    ]);

    // Combine and sort by creation time
    const items = [
      ...words.map((w) => ({
        type: "word" as const,
        id: w._id,
        createdAt: w.createdAt,
        displayText: w.text,
      })),
      ...verses.map((v) => ({
        type: "verse" as const,
        id: v._id,
        createdAt: v.createdAt,
        displayText: `${v.surahNumber}:${v.ayahStart}`,
      })),
      ...hadiths.map((h) => ({
        type: "hadith" as const,
        id: h._id,
        createdAt: h.createdAt,
        displayText: `${h.collection} #${h.hadithNumber}`,
      })),
      ...notes.map((n) => ({
        type: "note" as const,
        id: n._id,
        createdAt: n.createdAt ?? n.updatedAt,
        displayText: n.title ?? n.content.slice(0, 50),
      })),
    ];

    // Sort by creation time descending and take limit
    items.sort((a, b) => b.createdAt - a.createdAt);
    return items.slice(0, limit);
  },
});
