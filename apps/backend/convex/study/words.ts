/**
 * Words - Vocabulary CRUD with meanings and flashcard support
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, verifyOwnership, computeNextReview, now } from "./_helpers";
import { normalizeArabic, stripDiacritics, tokenizeArabic } from "../_lib/arabic";

// Meaning object validator
const meaningValidator = v.object({
  definition: v.string(),
  usageContext: v.optional(v.string()),
  examples: v.optional(v.array(v.string())),
});

// Grammatical info validator
const grammaticalInfoValidator = v.object({
  gender: v.optional(v.union(v.literal("masculine"), v.literal("feminine"), v.literal("both"))),
  number: v.optional(v.union(v.literal("singular"), v.literal("dual"), v.literal("plural"))),
  caseEndings: v.optional(v.string()),
  conjugations: v.optional(v.string()),
  nounType: v.optional(v.string()),
  verbForm: v.optional(v.number()),
});

/**
 * List all words for the current user.
 */
export const list = query({
  args: {
    rootId: v.optional(v.id("roots")),
    language: v.optional(v.union(v.literal("arabic"), v.literal("english"))),
    type: v.optional(v.union(v.literal("harf"), v.literal("ism"), v.literal("fiil"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.rootId) {
      return await ctx.db
        .query("words")
        .withIndex("by_user_root", (q) =>
          q.eq("userId", identity.subject).eq("rootId", args.rootId)
        )
        .collect();
    }

    if (args.language !== undefined) {
      const language = args.language;
      return await ctx.db
        .query("words")
        .withIndex("by_user_language", (q) =>
          q.eq("userId", identity.subject).eq("language", language)
        )
        .collect();
    }

    if (args.type !== undefined) {
      const type = args.type;
      return await ctx.db
        .query("words")
        .withIndex("by_user_type", (q) =>
          q.eq("userId", identity.subject).eq("type", type)
        )
        .collect();
    }

    return await ctx.db
      .query("words")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

/**
 * Get a single word with full details.
 */
export const getById = query({
  args: { id: v.id("words") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const word = await ctx.db.get(args.id);
    if (!word || word.userId !== identity.subject) return null;
    return word;
  },
});

/**
 * Get word detail with related data (root, explanations, backlinks).
 */
export const getDetail = query({
  args: { id: v.id("words") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const word = await ctx.db.get(args.id);
    if (!word || word.userId !== identity.subject) return null;

    // Get root if linked
    const root = word.rootId ? await ctx.db.get(word.rootId) : null;

    // Get explanations
    const explanations = await ctx.db
      .query("explanations")
      .withIndex("by_subject", (q) =>
        q.eq("subjectType", "word").eq("subjectId", args.id)
      )
      .collect();

    // Get backlinks (notes referencing this word)
    const backlinks = await ctx.db
      .query("backlinks")
      .withIndex("by_target", (q) =>
        q.eq("targetType", "word").eq("targetId", args.id)
      )
      .collect();

    // Get tags
    const entityTags = await ctx.db
      .query("entityTags")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "word").eq("entityId", args.id)
      )
      .collect();

    const tags = await Promise.all(
      entityTags.map(async (et) => await ctx.db.get(et.tagId))
    );

    return {
      word,
      root,
      explanations,
      backlinks,
      tags: tags.filter(Boolean),
    };
  },
});

/**
 * Create a new word.
 */
export const create = mutation({
  args: {
    text: v.string(),
    language: v.union(v.literal("arabic"), v.literal("english")),
    rootId: v.optional(v.id("roots")),
    type: v.optional(v.union(v.literal("harf"), v.literal("ism"), v.literal("fiil"))),
    wazan: v.optional(v.string()),
    meanings: v.array(meaningValidator),
    grammaticalInfo: v.optional(grammaticalInfoValidator),
    transliteration: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const timestamp = now();

    // Generate search fields
    const normalizedText = normalizeArabic(args.text);
    const diacriticStrippedText = stripDiacritics(args.text);
    const searchTokens = tokenizeArabic(args.text);

    return await ctx.db.insert("words", {
      userId,
      text: args.text,
      language: args.language,
      rootId: args.rootId,
      type: args.type,
      wazan: args.wazan,
      meanings: args.meanings,
      grammaticalInfo: args.grammaticalInfo,
      transliteration: args.transliteration,
      aliases: args.aliases,
      notes: args.notes,
      normalizedText,
      diacriticStrippedText,
      searchTokens,
      masteryLevel: 1,
      nextReview: computeNextReview(1),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

/**
 * Update an existing word.
 */
export const update = mutation({
  args: {
    id: v.id("words"),
    text: v.optional(v.string()),
    language: v.optional(v.union(v.literal("arabic"), v.literal("english"))),
    rootId: v.optional(v.id("roots")),
    type: v.optional(v.union(v.literal("harf"), v.literal("ism"), v.literal("fiil"))),
    wazan: v.optional(v.string()),
    meanings: v.optional(v.array(meaningValidator)),
    grammaticalInfo: v.optional(grammaticalInfoValidator),
    transliteration: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const word = await ctx.db.get(args.id);
    verifyOwnership(word, userId, "Word");

    const updates: Record<string, unknown> = { updatedAt: now() };

    if (args.text !== undefined) {
      updates.text = args.text;
      updates.normalizedText = normalizeArabic(args.text);
      updates.diacriticStrippedText = stripDiacritics(args.text);
      updates.searchTokens = tokenizeArabic(args.text);
    }
    if (args.language !== undefined) updates.language = args.language;
    if (args.rootId !== undefined) updates.rootId = args.rootId;
    if (args.type !== undefined) updates.type = args.type;
    if (args.wazan !== undefined) updates.wazan = args.wazan;
    if (args.meanings !== undefined) updates.meanings = args.meanings;
    if (args.grammaticalInfo !== undefined) updates.grammaticalInfo = args.grammaticalInfo;
    if (args.transliteration !== undefined) updates.transliteration = args.transliteration;
    if (args.aliases !== undefined) updates.aliases = args.aliases;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete a word.
 */
export const remove = mutation({
  args: { id: v.id("words") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const word = await ctx.db.get(args.id);
    verifyOwnership(word, userId, "Word");

    // Delete related explanations
    const explanations = await ctx.db
      .query("explanations")
      .withIndex("by_subject", (q) =>
        q.eq("subjectType", "word").eq("subjectId", args.id)
      )
      .collect();
    for (const exp of explanations) {
      await ctx.db.delete(exp._id);
    }

    // Delete related entity tags
    const entityTags = await ctx.db
      .query("entityTags")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "word").eq("entityId", args.id)
      )
      .collect();
    for (const et of entityTags) {
      await ctx.db.delete(et._id);
    }

    // Note: Backlinks are maintained when notes are saved, not here

    await ctx.db.delete(args.id);
  },
});

/**
 * Review a word (update mastery level and next review date).
 */
export const review = mutation({
  args: {
    id: v.id("words"),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const word = await ctx.db.get(args.id);
    verifyOwnership(word, userId, "Word");

    const currentLevel = word.masteryLevel ?? 1;
    let newLevel: number;

    if (args.success) {
      newLevel = Math.min(5, currentLevel + 1);
    } else {
      newLevel = Math.max(1, currentLevel - 1);
    }

    await ctx.db.patch(args.id, {
      masteryLevel: newLevel,
      nextReview: computeNextReview(newLevel),
      updatedAt: now(),
    });

    return { newLevel };
  },
});

/**
 * List words due for flashcard review.
 */
export const listDue = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentTime = now();
    const allWords = await ctx.db
      .query("words")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    // Filter to words that are due
    return allWords.filter(
      (w) => w.nextReview !== undefined && w.nextReview <= currentTime
    );
  },
});

/**
 * List recent words (for dashboard widget).
 */
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const limit = args.limit ?? 5;

    return await ctx.db
      .query("words")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(limit);
  },
});
