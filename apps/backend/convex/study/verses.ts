/**
 * Verses - Quran verses CRUD (individual or ranges)
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, verifyOwnership, now } from "./_helpers";
import { normalizeArabic, stripDiacritics, tokenizeArabic } from "../_lib/arabic";

/**
 * List all verses for the current user.
 */
export const list = query({
  args: {
    surahNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.surahNumber !== undefined) {
      return await ctx.db
        .query("verses")
        .withIndex("by_user_surah", (q) =>
          q.eq("userId", identity.subject).eq("surahNumber", args.surahNumber!)
        )
        .collect();
    }

    return await ctx.db
      .query("verses")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

/**
 * Get a single verse by ID.
 */
export const getById = query({
  args: { id: v.id("verses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const verse = await ctx.db.get(args.id);
    if (!verse || verse.userId !== identity.subject) return null;
    return verse;
  },
});

/**
 * Get verse detail with related data (explanations, backlinks, tags).
 */
export const getDetail = query({
  args: { id: v.id("verses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const verse = await ctx.db.get(args.id);
    if (!verse || verse.userId !== identity.subject) return null;

    // Get explanations
    const explanations = await ctx.db
      .query("explanations")
      .withIndex("by_subject", (q) =>
        q.eq("subjectType", "verse").eq("subjectId", args.id)
      )
      .collect();

    // Get backlinks
    const backlinks = await ctx.db
      .query("backlinks")
      .withIndex("by_target", (q) =>
        q.eq("targetType", "verse").eq("targetId", args.id)
      )
      .collect();

    // Get tags
    const entityTags = await ctx.db
      .query("entityTags")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "verse").eq("entityId", args.id)
      )
      .collect();

    const tags = await Promise.all(
      entityTags.map(async (et) => await ctx.db.get(et.tagId))
    );

    return {
      verse,
      explanations,
      backlinks,
      tags: tags.filter(Boolean),
    };
  },
});

// Ayah translation validator for structured translations
const ayahTranslationValidator = v.object({
  sourceId: v.string(),
  sourceName: v.string(),
  text: v.string(),
  sourceType: v.union(v.literal("api"), v.literal("custom")),
});

// Individual ayah validator
const ayahValidator = v.object({
  ayahNumber: v.number(),
  arabicText: v.string(),
  translations: v.array(ayahTranslationValidator),
});

/**
 * Create a new verse.
 * Supports both legacy single translation and new multi-translation ayahs format.
 */
export const create = mutation({
  args: {
    surahNumber: v.number(),
    surahNameArabic: v.optional(v.string()),
    surahNameEnglish: v.optional(v.string()),
    ayahStart: v.number(),
    ayahEnd: v.optional(v.number()),
    arabicText: v.string(),
    translation: v.optional(v.string()),
    topic: v.optional(v.string()),
    // NEW: Structured ayahs with translations
    ayahs: v.optional(v.array(ayahValidator)),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const timestamp = now();

    // Validate surah number
    if (args.surahNumber < 1 || args.surahNumber > 114) {
      throw new Error("Surah number must be between 1 and 114");
    }

    // Generate search fields from arabicText
    const normalizedText = normalizeArabic(args.arabicText);
    const diacriticStrippedText = stripDiacritics(args.arabicText);
    const searchTokens = tokenizeArabic(args.arabicText);

    return await ctx.db.insert("verses", {
      userId,
      surahNumber: args.surahNumber,
      surahNameArabic: args.surahNameArabic,
      surahNameEnglish: args.surahNameEnglish,
      ayahStart: args.ayahStart,
      ayahEnd: args.ayahEnd,
      arabicText: args.arabicText,
      translation: args.translation,
      topic: args.topic,
      ayahs: args.ayahs,
      normalizedText,
      diacriticStrippedText,
      searchTokens,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

/**
 * Update an existing verse.
 * Supports both legacy single translation and new multi-translation ayahs format.
 */
export const update = mutation({
  args: {
    id: v.id("verses"),
    surahNumber: v.optional(v.number()),
    surahNameArabic: v.optional(v.string()),
    surahNameEnglish: v.optional(v.string()),
    ayahStart: v.optional(v.number()),
    ayahEnd: v.optional(v.number()),
    arabicText: v.optional(v.string()),
    translation: v.optional(v.string()),
    topic: v.optional(v.string()),
    // NEW: Structured ayahs with translations
    ayahs: v.optional(v.array(ayahValidator)),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const verse = await ctx.db.get(args.id);
    verifyOwnership(verse, userId, "Verse");

    const updates: Record<string, unknown> = { updatedAt: now() };

    if (args.surahNumber !== undefined) {
      if (args.surahNumber < 1 || args.surahNumber > 114) {
        throw new Error("Surah number must be between 1 and 114");
      }
      updates.surahNumber = args.surahNumber;
    }
    if (args.surahNameArabic !== undefined) updates.surahNameArabic = args.surahNameArabic;
    if (args.surahNameEnglish !== undefined) updates.surahNameEnglish = args.surahNameEnglish;
    if (args.ayahStart !== undefined) updates.ayahStart = args.ayahStart;
    if (args.ayahEnd !== undefined) updates.ayahEnd = args.ayahEnd;
    if (args.translation !== undefined) updates.translation = args.translation;
    if (args.topic !== undefined) updates.topic = args.topic;
    if (args.ayahs !== undefined) updates.ayahs = args.ayahs;
    if (args.arabicText !== undefined) {
      updates.arabicText = args.arabicText;
      updates.normalizedText = normalizeArabic(args.arabicText);
      updates.diacriticStrippedText = stripDiacritics(args.arabicText);
      updates.searchTokens = tokenizeArabic(args.arabicText);
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete a verse.
 */
export const remove = mutation({
  args: { id: v.id("verses") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const verse = await ctx.db.get(args.id);
    verifyOwnership(verse, userId, "Verse");

    // Delete related explanations
    const explanations = await ctx.db
      .query("explanations")
      .withIndex("by_subject", (q) =>
        q.eq("subjectType", "verse").eq("subjectId", args.id)
      )
      .collect();
    for (const exp of explanations) {
      await ctx.db.delete(exp._id);
    }

    // Delete related entity tags
    const entityTags = await ctx.db
      .query("entityTags")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "verse").eq("entityId", args.id)
      )
      .collect();
    for (const et of entityTags) {
      await ctx.db.delete(et._id);
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * Find verses that overlap with a given range.
 * Useful for finding saved captures that match a reference.
 */
export const findOverlapping = query({
  args: {
    surahNumber: v.number(),
    ayahStart: v.number(),
    ayahEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const verses = await ctx.db
      .query("verses")
      .withIndex("by_user_surah", (q) =>
        q.eq("userId", identity.subject).eq("surahNumber", args.surahNumber)
      )
      .collect();

    const queryEnd = args.ayahEnd ?? args.ayahStart;

    return verses.filter((v) => {
      const verseEnd = v.ayahEnd ?? v.ayahStart;
      // Check if ranges overlap
      return v.ayahStart <= queryEnd && verseEnd >= args.ayahStart;
    });
  },
});

/**
 * Format verse reference string.
 */
export function formatVerseRef(
  surahNumber: number,
  ayahStart: number,
  ayahEnd?: number
): string {
  if (ayahEnd && ayahEnd !== ayahStart) {
    return `${surahNumber}:${ayahStart}-${ayahEnd}`;
  }
  return `${surahNumber}:${ayahStart}`;
}
