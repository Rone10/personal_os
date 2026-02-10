/**
 * Roots - Arabic root letters CRUD
 * The foundational unit for Arabic vocabulary.
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, verifyOwnership, now } from "./_helpers";

/**
 * List all roots for the current user.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("roots")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

/**
 * Get a single root by ID.
 */
export const getById = query({
  args: { id: v.id("roots") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const root = await ctx.db.get(args.id);
    if (!root || root.userId !== identity.subject) return null;
    return root;
  },
});

/**
 * Search roots by latinized form.
 */
export const searchByLatinized = query({
  args: { latinized: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Exact match on latinized form
    return await ctx.db
      .query("roots")
      .withIndex("by_user_latinized", (q) =>
        q.eq("userId", identity.subject).eq("latinized", args.latinized.toLowerCase())
      )
      .collect();
  },
});

/**
 * Create a new root.
 */
export const create = mutation({
  args: {
    letters: v.string(),
    latinized: v.string(),
    coreMeaning: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const timestamp = now();

    return await ctx.db.insert("roots", {
      userId,
      letters: args.letters,
      latinized: args.latinized.toLowerCase(),
      coreMeaning: args.coreMeaning,
      notes: args.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

/**
 * Update an existing root.
 */
export const update = mutation({
  args: {
    id: v.id("roots"),
    letters: v.optional(v.string()),
    latinized: v.optional(v.string()),
    coreMeaning: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const root = await ctx.db.get(args.id);
    verifyOwnership(root, userId, "Root");

    const updates: Record<string, unknown> = { updatedAt: now() };
    if (args.letters !== undefined) updates.letters = args.letters;
    if (args.latinized !== undefined) updates.latinized = args.latinized.toLowerCase();
    if (args.coreMeaning !== undefined) updates.coreMeaning = args.coreMeaning;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete a root and optionally cascade to words.
 */
export const remove = mutation({
  args: { id: v.id("roots") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const root = await ctx.db.get(args.id);
    verifyOwnership(root, userId, "Root");

    // Clear rootId from all words that reference this root
    const words = await ctx.db
      .query("words")
      .withIndex("by_user_root", (q) => q.eq("userId", userId).eq("rootId", args.id))
      .collect();

    for (const word of words) {
      await ctx.db.patch(word._id, { rootId: undefined });
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * Get all words that belong to a root.
 */
export const getWords = query({
  args: { rootId: v.id("roots") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("words")
      .withIndex("by_user_root", (q) =>
        q.eq("userId", identity.subject).eq("rootId", args.rootId)
      )
      .collect();
  },
});
