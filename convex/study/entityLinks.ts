/**
 * Entity Links CRUD operations.
 * Manages direct relationships between entities (beyond note-based backlinks).
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, verifyOwnership, now } from "./_helpers";

// Entity types that support linking
const entityTypeValidator = v.union(
  v.literal("word"),
  v.literal("verse"),
  v.literal("hadith"),
  v.literal("root"),
  v.literal("note")
);

// Relationship types between entities
const relationshipTypeValidator = v.union(
  v.literal("related"),
  v.literal("synonym"),
  v.literal("antonym"),
  v.literal("explains"),
  v.literal("derived_from"),
  v.literal("contrasts"),
  v.literal("supports"),
  v.literal("example_of")
);

/**
 * List all entity links for the current user.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("entityLinks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

/**
 * Get all links FROM a specific entity (outgoing links).
 */
export const getLinksFrom = query({
  args: {
    sourceType: entityTypeValidator,
    sourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const links = await ctx.db
      .query("entityLinks")
      .withIndex("by_source", (q) =>
        q
          .eq("userId", identity.subject)
          .eq("sourceType", args.sourceType)
          .eq("sourceId", args.sourceId)
      )
      .collect();

    // Hydrate target entities
    const hydratedLinks = await Promise.all(
      links.map(async (link) => {
        const target = await ctx.db.get(link.targetId as any);
        return {
          ...link,
          target,
        };
      })
    );

    return hydratedLinks;
  },
});

/**
 * Get all links TO a specific entity (incoming links).
 */
export const getLinksTo = query({
  args: {
    targetType: entityTypeValidator,
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const links = await ctx.db
      .query("entityLinks")
      .withIndex("by_target", (q) =>
        q
          .eq("userId", identity.subject)
          .eq("targetType", args.targetType)
          .eq("targetId", args.targetId)
      )
      .collect();

    // Hydrate source entities
    const hydratedLinks = await Promise.all(
      links.map(async (link) => {
        const source = await ctx.db.get(link.sourceId as any);
        return {
          ...link,
          source,
        };
      })
    );

    return hydratedLinks;
  },
});

/**
 * Get all links for a specific entity (both incoming and outgoing).
 */
export const getEntityLinks = query({
  args: {
    entityType: entityTypeValidator,
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { outgoing: [], incoming: [] };

    // Get outgoing links (this entity is the source)
    const outgoingLinks = await ctx.db
      .query("entityLinks")
      .withIndex("by_source", (q) =>
        q
          .eq("userId", identity.subject)
          .eq("sourceType", args.entityType)
          .eq("sourceId", args.entityId)
      )
      .collect();

    // Get incoming links (this entity is the target)
    const incomingLinks = await ctx.db
      .query("entityLinks")
      .withIndex("by_target", (q) =>
        q
          .eq("userId", identity.subject)
          .eq("targetType", args.entityType)
          .eq("targetId", args.entityId)
      )
      .collect();

    // Hydrate both sets
    const hydratedOutgoing = await Promise.all(
      outgoingLinks.map(async (link) => {
        const target = await ctx.db.get(link.targetId as any);
        return { ...link, target };
      })
    );

    const hydratedIncoming = await Promise.all(
      incomingLinks.map(async (link) => {
        const source = await ctx.db.get(link.sourceId as any);
        return { ...link, source };
      })
    );

    return {
      outgoing: hydratedOutgoing,
      incoming: hydratedIncoming,
    };
  },
});

/**
 * Create a new entity link.
 */
export const create = mutation({
  args: {
    sourceType: entityTypeValidator,
    sourceId: v.string(),
    targetType: entityTypeValidator,
    targetId: v.string(),
    relationshipType: relationshipTypeValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Check for existing link (prevent duplicates)
    const existingLinks = await ctx.db
      .query("entityLinks")
      .withIndex("by_source", (q) =>
        q
          .eq("userId", userId)
          .eq("sourceType", args.sourceType)
          .eq("sourceId", args.sourceId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("targetType"), args.targetType),
          q.eq(q.field("targetId"), args.targetId)
        )
      )
      .first();

    if (existingLinks) {
      throw new Error("Link already exists between these entities");
    }

    // Prevent self-linking
    if (
      args.sourceType === args.targetType &&
      args.sourceId === args.targetId
    ) {
      throw new Error("Cannot link an entity to itself");
    }

    return await ctx.db.insert("entityLinks", {
      userId,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      targetType: args.targetType,
      targetId: args.targetId,
      relationshipType: args.relationshipType,
      note: args.note,
      createdAt: now(),
    });
  },
});

/**
 * Update an existing entity link.
 */
export const update = mutation({
  args: {
    id: v.id("entityLinks"),
    relationshipType: v.optional(relationshipTypeValidator),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const link = await ctx.db.get(args.id);
    verifyOwnership(link, userId, "Entity link");

    const updates: Record<string, unknown> = {};
    if (args.relationshipType !== undefined) {
      updates.relationshipType = args.relationshipType;
    }
    if (args.note !== undefined) {
      updates.note = args.note;
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete an entity link.
 */
export const remove = mutation({
  args: { id: v.id("entityLinks") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const link = await ctx.db.get(args.id);
    verifyOwnership(link, userId, "Entity link");

    await ctx.db.delete(args.id);
  },
});

/**
 * Delete all links for an entity (used when entity is deleted).
 */
export const removeAllForEntity = mutation({
  args: {
    entityType: entityTypeValidator,
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Delete outgoing links
    const outgoingLinks = await ctx.db
      .query("entityLinks")
      .withIndex("by_source", (q) =>
        q
          .eq("userId", userId)
          .eq("sourceType", args.entityType)
          .eq("sourceId", args.entityId)
      )
      .collect();

    // Delete incoming links
    const incomingLinks = await ctx.db
      .query("entityLinks")
      .withIndex("by_target", (q) =>
        q
          .eq("userId", userId)
          .eq("targetType", args.entityType)
          .eq("targetId", args.entityId)
      )
      .collect();

    for (const link of [...outgoingLinks, ...incomingLinks]) {
      await ctx.db.delete(link._id);
    }
  },
});
