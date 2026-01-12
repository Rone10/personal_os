/**
 * Explanations CRUD
 * Separates interpretations from notes. One word/verse can have multiple explanations.
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, verifyOwnership, now } from "./_helpers";

/**
 * List explanations for a subject.
 */
export const listBySubject = query({
  args: {
    subjectType: v.union(
      v.literal("word"),
      v.literal("verse"),
      v.literal("hadith"),
      v.literal("root")
    ),
    subjectId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("explanations")
      .withIndex("by_subject", (q) =>
        q.eq("subjectType", args.subjectType).eq("subjectId", args.subjectId)
      )
      .collect();
  },
});

/**
 * Get a single explanation by ID.
 */
export const getById = query({
  args: { id: v.id("explanations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const explanation = await ctx.db.get(args.id);
    if (!explanation || explanation.userId !== identity.subject) return null;
    return explanation;
  },
});

/**
 * Create a new explanation.
 */
export const create = mutation({
  args: {
    content: v.string(),
    sourceType: v.union(
      v.literal("lesson"),
      v.literal("chapter"),
      v.literal("personal"),
      v.literal("external")
    ),
    sourceId: v.optional(v.string()),
    sourceLabel: v.optional(v.string()),
    subjectType: v.union(
      v.literal("word"),
      v.literal("verse"),
      v.literal("hadith"),
      v.literal("root")
    ),
    subjectId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const timestamp = now();

    // Get max order for this subject
    const existing = await ctx.db
      .query("explanations")
      .withIndex("by_subject", (q) =>
        q.eq("subjectType", args.subjectType).eq("subjectId", args.subjectId)
      )
      .collect();
    const maxOrder = Math.max(0, ...existing.map((e) => e.order ?? 0));

    return await ctx.db.insert("explanations", {
      userId,
      content: args.content,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      sourceLabel: args.sourceLabel,
      subjectType: args.subjectType,
      subjectId: args.subjectId,
      order: maxOrder + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

/**
 * Update an existing explanation.
 */
export const update = mutation({
  args: {
    id: v.id("explanations"),
    content: v.optional(v.string()),
    sourceType: v.optional(
      v.union(
        v.literal("lesson"),
        v.literal("chapter"),
        v.literal("personal"),
        v.literal("external")
      )
    ),
    sourceId: v.optional(v.string()),
    sourceLabel: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const explanation = await ctx.db.get(args.id);
    verifyOwnership(explanation, userId, "Explanation");

    const updates: Record<string, unknown> = { updatedAt: now() };
    if (args.content !== undefined) updates.content = args.content;
    if (args.sourceType !== undefined) updates.sourceType = args.sourceType;
    if (args.sourceId !== undefined) updates.sourceId = args.sourceId;
    if (args.sourceLabel !== undefined) updates.sourceLabel = args.sourceLabel;
    if (args.order !== undefined) updates.order = args.order;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete an explanation.
 */
export const remove = mutation({
  args: { id: v.id("explanations") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const explanation = await ctx.db.get(args.id);
    verifyOwnership(explanation, userId, "Explanation");

    // Delete entity tags for this explanation
    const entityTags = await ctx.db
      .query("entityTags")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "explanation").eq("entityId", args.id)
      )
      .collect();
    for (const et of entityTags) {
      await ctx.db.delete(et._id);
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * Reorder explanations for a subject.
 */
export const reorder = mutation({
  args: {
    ids: v.array(v.id("explanations")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const timestamp = now();

    for (let i = 0; i < args.ids.length; i++) {
      const explanation = await ctx.db.get(args.ids[i]);
      if (explanation && explanation.userId === userId) {
        await ctx.db.patch(args.ids[i], {
          order: i + 1,
          updatedAt: timestamp,
        });
      }
    }
  },
});
