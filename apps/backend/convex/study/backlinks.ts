/**
 * Backlinks queries
 * Enables "what references this?" functionality
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get all backlinks for a target entity.
 * Returns notes that reference the given entity.
 */
export const getBacklinksFor = query({
  args: {
    targetType: v.string(),
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const backlinks = await ctx.db
      .query("backlinks")
      .withIndex("by_target", (q) =>
        q.eq("targetType", args.targetType).eq("targetId", args.targetId)
      )
      .collect();

    // Filter to user's backlinks and hydrate with note info
    const userBacklinks = backlinks.filter(
      (bl) => bl.userId === identity.subject
    );

    const hydratedBacklinks = await Promise.all(
      userBacklinks.map(async (bl) => {
        const note = await ctx.db.get(bl.noteId);
        return {
          ...bl,
          noteTitle: note?.title,
          noteContent: note?.content,
        };
      })
    );

    return hydratedBacklinks;
  },
});

/**
 * Get backlinks count for a target entity.
 */
export const getBacklinksCount = query({
  args: {
    targetType: v.string(),
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const backlinks = await ctx.db
      .query("backlinks")
      .withIndex("by_target", (q) =>
        q.eq("targetType", args.targetType).eq("targetId", args.targetId)
      )
      .collect();

    return backlinks.filter((bl) => bl.userId === identity.subject).length;
  },
});

/**
 * Get all backlinks for multiple targets (batch query).
 * Useful for list views showing backlink counts.
 */
export const getBacklinksForMany = query({
  args: {
    targets: v.array(
      v.object({
        targetType: v.string(),
        targetId: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return {};

    const result: Record<string, number> = {};

    for (const target of args.targets) {
      const key = `${target.targetType}:${target.targetId}`;
      const backlinks = await ctx.db
        .query("backlinks")
        .withIndex("by_target", (q) =>
          q.eq("targetType", target.targetType).eq("targetId", target.targetId)
        )
        .collect();

      result[key] = backlinks.filter(
        (bl) => bl.userId === identity.subject
      ).length;
    }

    return result;
  },
});

/**
 * Get all outgoing references from a note.
 */
export const getOutgoingFromNote = query({
  args: {
    noteId: v.id("studyNotes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const backlinks = await ctx.db
      .query("backlinks")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .collect();

    return backlinks.filter((bl) => bl.userId === identity.subject);
  },
});
