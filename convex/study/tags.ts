/**
 * Tags CRUD and entity tagging
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, verifyOwnership, now } from "./_helpers";

/**
 * List all tags for the current user.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

/**
 * Get a single tag by ID.
 */
export const getById = query({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const tag = await ctx.db.get(args.id);
    if (!tag || tag.userId !== identity.subject) return null;
    return tag;
  },
});

/**
 * Get tag detail with all tagged entities hydrated.
 */
export const getTagDetail = query({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const tag = await ctx.db.get(args.id);
    if (!tag || tag.userId !== identity.subject) return null;

    // Get all entity associations for this tag
    const entityTags = await ctx.db
      .query("entityTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.id))
      .collect();

    // Group by entity type and hydrate each entity
    const entitiesByType: Record<string, any[]> = {
      word: [],
      verse: [],
      hadith: [],
      note: [],
      lesson: [],
      chapter: [],
      root: [],
      explanation: [],
    };

    for (const et of entityTags) {
      const entity = await ctx.db.get(et.entityId as any);
      if (entity) {
        entitiesByType[et.entityType]?.push(entity);
      }
    }

    return {
      tag,
      entities: entitiesByType,
      totalCount: entityTags.length,
    };
  },
});

/**
 * Get a tag by name.
 */
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_user_name", (q) =>
        q.eq("userId", identity.subject).eq("name", args.name)
      )
      .collect();

    return tags[0] ?? null;
  },
});

/**
 * Create a new tag.
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Check for duplicate name
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_user_name", (q) =>
        q.eq("userId", userId).eq("name", args.name)
      )
      .first();

    if (existing) {
      throw new Error(`Tag "${args.name}" already exists`);
    }

    return await ctx.db.insert("tags", {
      userId,
      name: args.name,
      description: args.description,
      color: args.color,
      createdAt: now(),
    });
  },
});

/**
 * Update an existing tag.
 */
export const update = mutation({
  args: {
    id: v.id("tags"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const tag = await ctx.db.get(args.id);
    verifyOwnership(tag, userId, "Tag");

    // Check for duplicate name if renaming
    if (args.name && args.name !== tag.name) {
      const existing = await ctx.db
        .query("tags")
        .withIndex("by_user_name", (q) =>
          q.eq("userId", userId).eq("name", args.name!)
        )
        .first();

      if (existing) {
        throw new Error(`Tag "${args.name}" already exists`);
      }
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete a tag and all its entity associations.
 */
export const remove = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const tag = await ctx.db.get(args.id);
    verifyOwnership(tag, userId, "Tag");

    // Delete all entity tag associations
    const entityTags = await ctx.db
      .query("entityTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.id))
      .collect();

    for (const et of entityTags) {
      await ctx.db.delete(et._id);
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * Tag an entity.
 */
export const tagEntity = mutation({
  args: {
    tagId: v.id("tags"),
    entityType: v.union(
      v.literal("word"),
      v.literal("verse"),
      v.literal("hadith"),
      v.literal("note"),
      v.literal("lesson"),
      v.literal("chapter"),
      v.literal("root"),
      v.literal("explanation")
    ),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify tag ownership
    const tag = await ctx.db.get(args.tagId);
    verifyOwnership(tag, userId, "Tag");

    // Check if already tagged
    const existing = await ctx.db
      .query("entityTags")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .filter((q) => q.eq(q.field("tagId"), args.tagId))
      .first();

    if (existing) {
      return existing._id; // Already tagged
    }

    return await ctx.db.insert("entityTags", {
      userId,
      tagId: args.tagId,
      entityType: args.entityType,
      entityId: args.entityId,
    });
  },
});

/**
 * Remove a tag from an entity.
 */
export const untagEntity = mutation({
  args: {
    tagId: v.id("tags"),
    entityType: v.union(
      v.literal("word"),
      v.literal("verse"),
      v.literal("hadith"),
      v.literal("note"),
      v.literal("lesson"),
      v.literal("chapter"),
      v.literal("root"),
      v.literal("explanation")
    ),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Find the entity tag
    const entityTag = await ctx.db
      .query("entityTags")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .filter((q) => q.eq(q.field("tagId"), args.tagId))
      .first();

    if (entityTag && entityTag.userId === userId) {
      await ctx.db.delete(entityTag._id);
    }
  },
});

/**
 * Get all tags for an entity.
 */
export const getEntityTags = query({
  args: {
    entityType: v.union(
      v.literal("word"),
      v.literal("verse"),
      v.literal("hadith"),
      v.literal("note"),
      v.literal("lesson"),
      v.literal("chapter"),
      v.literal("root"),
      v.literal("explanation")
    ),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const entityTags = await ctx.db
      .query("entityTags")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .collect();

    const tags = await Promise.all(
      entityTags.map(async (et) => await ctx.db.get(et.tagId))
    );

    return tags.filter(Boolean);
  },
});

/**
 * Get all entities with a specific tag.
 */
export const getEntitiesByTag = query({
  args: {
    tagId: v.id("tags"),
    entityType: v.optional(
      v.union(
        v.literal("word"),
        v.literal("verse"),
        v.literal("hadith"),
        v.literal("note"),
        v.literal("lesson"),
        v.literal("chapter"),
        v.literal("root"),
        v.literal("explanation")
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    let entityTags = await ctx.db
      .query("entityTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.tagId))
      .collect();

    if (args.entityType) {
      entityTags = entityTags.filter((et) => et.entityType === args.entityType);
    }

    return entityTags;
  },
});
