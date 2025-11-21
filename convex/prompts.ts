import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("prompts")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    variables: v.optional(v.array(v.string())),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("prompts", {
      ...args,
      userId: identity.subject,
      isFavorite: false,
      lastUsed: Date.now(),
    });
  },
});

export const toggleFavorite = mutation({
  args: {
    id: v.id("prompts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const prompt = await ctx.db.get(args.id);
    if (!prompt || prompt.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, { isFavorite: !prompt.isFavorite });
  },
});
