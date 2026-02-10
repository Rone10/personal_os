/**
 * Hadiths - Hadith CRUD
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, verifyOwnership, now } from "./_helpers";
import { normalizeArabic, stripDiacritics, tokenizeArabic } from "../_lib/arabic";

/**
 * List all hadiths for the current user.
 */
export const list = query({
  args: {
    collection: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.collection) {
      return await ctx.db
        .query("hadiths")
        .withIndex("by_user_collection", (q) =>
          q.eq("userId", identity.subject).eq("collection", args.collection!)
        )
        .collect();
    }

    return await ctx.db
      .query("hadiths")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

/**
 * Get a single hadith by ID.
 */
export const getById = query({
  args: { id: v.id("hadiths") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const hadith = await ctx.db.get(args.id);
    if (!hadith || hadith.userId !== identity.subject) return null;
    return hadith;
  },
});

/**
 * Get hadith detail with related data.
 */
export const getDetail = query({
  args: { id: v.id("hadiths") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const hadith = await ctx.db.get(args.id);
    if (!hadith || hadith.userId !== identity.subject) return null;

    // Get explanations
    const explanations = await ctx.db
      .query("explanations")
      .withIndex("by_subject", (q) =>
        q.eq("subjectType", "hadith").eq("subjectId", args.id)
      )
      .collect();

    // Get backlinks
    const backlinks = await ctx.db
      .query("backlinks")
      .withIndex("by_target", (q) =>
        q.eq("targetType", "hadith").eq("targetId", args.id)
      )
      .collect();

    // Get tags
    const entityTags = await ctx.db
      .query("entityTags")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "hadith").eq("entityId", args.id)
      )
      .collect();

    const tags = await Promise.all(
      entityTags.map(async (et) => await ctx.db.get(et.tagId))
    );

    return {
      hadith,
      explanations,
      backlinks,
      tags: tags.filter(Boolean),
    };
  },
});

/**
 * Create a new hadith.
 */
export const create = mutation({
  args: {
    collection: v.string(),
    bookName: v.optional(v.string()),
    hadithNumber: v.string(),
    grading: v.optional(
      v.union(v.literal("sahih"), v.literal("hasan"), v.literal("daif"), v.literal("mawdu"))
    ),
    arabicText: v.string(),
    translation: v.optional(v.string()),
    topic: v.optional(v.string()),
    narratorChain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const timestamp = now();

    // Generate search fields
    const normalizedText = normalizeArabic(args.arabicText);
    const diacriticStrippedText = stripDiacritics(args.arabicText);
    const searchTokens = tokenizeArabic(args.arabicText);

    return await ctx.db.insert("hadiths", {
      userId,
      collection: args.collection,
      bookName: args.bookName,
      hadithNumber: args.hadithNumber,
      grading: args.grading,
      arabicText: args.arabicText,
      translation: args.translation,
      topic: args.topic,
      narratorChain: args.narratorChain,
      normalizedText,
      diacriticStrippedText,
      searchTokens,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

/**
 * Update an existing hadith.
 */
export const update = mutation({
  args: {
    id: v.id("hadiths"),
    collection: v.optional(v.string()),
    bookName: v.optional(v.string()),
    hadithNumber: v.optional(v.string()),
    grading: v.optional(
      v.union(v.literal("sahih"), v.literal("hasan"), v.literal("daif"), v.literal("mawdu"))
    ),
    arabicText: v.optional(v.string()),
    translation: v.optional(v.string()),
    topic: v.optional(v.string()),
    narratorChain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const hadith = await ctx.db.get(args.id);
    verifyOwnership(hadith, userId, "Hadith");

    const updates: Record<string, unknown> = { updatedAt: now() };

    if (args.collection !== undefined) updates.collection = args.collection;
    if (args.bookName !== undefined) updates.bookName = args.bookName;
    if (args.hadithNumber !== undefined) updates.hadithNumber = args.hadithNumber;
    if (args.grading !== undefined) updates.grading = args.grading;
    if (args.translation !== undefined) updates.translation = args.translation;
    if (args.topic !== undefined) updates.topic = args.topic;
    if (args.narratorChain !== undefined) updates.narratorChain = args.narratorChain;
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
 * Delete a hadith.
 */
export const remove = mutation({
  args: { id: v.id("hadiths") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const hadith = await ctx.db.get(args.id);
    verifyOwnership(hadith, userId, "Hadith");

    // Delete related explanations
    const explanations = await ctx.db
      .query("explanations")
      .withIndex("by_subject", (q) =>
        q.eq("subjectType", "hadith").eq("subjectId", args.id)
      )
      .collect();
    for (const exp of explanations) {
      await ctx.db.delete(exp._id);
    }

    // Delete related entity tags
    const entityTags = await ctx.db
      .query("entityTags")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "hadith").eq("entityId", args.id)
      )
      .collect();
    for (const et of entityTags) {
      await ctx.db.delete(et._id);
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * List unique hadith collections.
 */
export const listCollections = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const hadiths = await ctx.db
      .query("hadiths")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    // Get unique collections
    const collections = [...new Set(hadiths.map((h) => h.collection))];
    return collections.sort();
  },
});

/**
 * Format hadith reference string.
 */
export function formatHadithRef(collection: string, hadithNumber: string): string {
  return `${collection} #${hadithNumber}`;
}
