import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getVocab = query({
  args: {
    root: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.root) {
      return await ctx.db
        .query("vocab")
        .withIndex("by_user_root", (q) => 
          q.eq("userId", identity.subject).eq("root", args.root!)
        )
        .collect();
    }

    // If no root specified, just get all (or limit?)
    // Using the index with just userId
    return await ctx.db
      .query("vocab")
      .withIndex("by_user_root", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const addVocab = mutation({
  args: {
    arabicText: v.string(),
    transliteration: v.optional(v.string()),
    translation: v.string(),
    root: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("vocab", {
      ...args,
      userId: identity.subject,
      masteryLevel: 1,
      nextReview: Date.now(),
    });
  },
});

export const reviewVocab = mutation({
  args: {
    id: v.id("vocab"),
    masteryLevel: v.number(), // 1-5
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const vocab = await ctx.db.get(args.id);
    if (!vocab || vocab.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Simple spaced repetition logic
    // Level 1: 1 day, 2: 3 days, 3: 7 days, 4: 14 days, 5: 30 days
    const intervals = [1, 3, 7, 14, 30];
    const daysToAdd = intervals[Math.min(args.masteryLevel, 5) - 1] || 1;
    const nextReview = Date.now() + daysToAdd * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.id, {
      masteryLevel: args.masteryLevel,
      nextReview,
    });
  },
});
