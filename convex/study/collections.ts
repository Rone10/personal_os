/**
 * Collections CRUD operations.
 * Manages curated topic hubs with narrative and custom ordering.
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, verifyOwnership, now } from "./_helpers";

// Collection item validator
const collectionItemValidator = v.object({
  entityType: v.string(), // word, verse, hadith, root, note, lesson, chapter
  entityId: v.string(),
  order: v.number(),
  annotation: v.optional(v.string()),
});

/**
 * List all collections for the current user.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("collections")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

/**
 * Get a single collection by ID.
 */
export const getById = query({
  args: { id: v.id("collections") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const collection = await ctx.db.get(args.id);
    if (!collection || collection.userId !== identity.subject) return null;
    return collection;
  },
});

/**
 * Get collection detail with hydrated items and tags.
 */
export const getDetail = query({
  args: { id: v.id("collections") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const collection = await ctx.db.get(args.id);
    if (!collection || collection.userId !== identity.subject) return null;

    // Hydrate collection items
    const hydratedItems = await Promise.all(
      collection.items.map(async (item) => {
        const entity = await ctx.db.get(item.entityId as any);
        return {
          ...item,
          entity,
        };
      })
    );

    // Hydrate tags if present
    const hydratedTags = collection.tags
      ? await Promise.all(
          collection.tags.map(async (tagId) => await ctx.db.get(tagId))
        )
      : [];

    return {
      collection,
      items: hydratedItems.sort((a, b) => a.order - b.order),
      tags: hydratedTags.filter(Boolean),
    };
  },
});

/**
 * Create a new collection.
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    contentJson: v.optional(v.any()), // Rich text introduction
    items: v.optional(v.array(collectionItemValidator)),
    tags: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const timestamp = now();

    return await ctx.db.insert("collections", {
      userId,
      title: args.title,
      description: args.description,
      contentJson: args.contentJson,
      items: args.items ?? [],
      tags: args.tags,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

/**
 * Update an existing collection.
 */
export const update = mutation({
  args: {
    id: v.id("collections"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    contentJson: v.optional(v.any()),
    items: v.optional(v.array(collectionItemValidator)),
    tags: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const collection = await ctx.db.get(args.id);
    verifyOwnership(collection, userId, "Collection");

    const updates: Record<string, unknown> = { updatedAt: now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.contentJson !== undefined) updates.contentJson = args.contentJson;
    if (args.items !== undefined) updates.items = args.items;
    if (args.tags !== undefined) updates.tags = args.tags;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete a collection.
 */
export const remove = mutation({
  args: { id: v.id("collections") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const collection = await ctx.db.get(args.id);
    verifyOwnership(collection, userId, "Collection");

    await ctx.db.delete(args.id);
  },
});

/**
 * Add an item to a collection.
 */
export const addItem = mutation({
  args: {
    collectionId: v.id("collections"),
    entityType: v.string(),
    entityId: v.string(),
    annotation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const collection = await ctx.db.get(args.collectionId);
    verifyOwnership(collection, userId, "Collection");

    // Check if item already exists
    const existingItem = collection.items.find(
      (item) =>
        item.entityType === args.entityType && item.entityId === args.entityId
    );

    if (existingItem) {
      throw new Error("Item already exists in collection");
    }

    // Calculate next order value
    const maxOrder = collection.items.reduce(
      (max, item) => Math.max(max, item.order),
      -1
    );

    const newItems = [
      ...collection.items,
      {
        entityType: args.entityType,
        entityId: args.entityId,
        order: maxOrder + 1,
        annotation: args.annotation,
      },
    ];

    await ctx.db.patch(args.collectionId, {
      items: newItems,
      updatedAt: now(),
    });

    return args.collectionId;
  },
});

/**
 * Remove an item from a collection.
 */
export const removeItem = mutation({
  args: {
    collectionId: v.id("collections"),
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const collection = await ctx.db.get(args.collectionId);
    verifyOwnership(collection, userId, "Collection");

    const newItems = collection.items.filter(
      (item) =>
        !(item.entityType === args.entityType && item.entityId === args.entityId)
    );

    await ctx.db.patch(args.collectionId, {
      items: newItems,
      updatedAt: now(),
    });

    return args.collectionId;
  },
});

/**
 * Update item annotation in a collection.
 */
export const updateItemAnnotation = mutation({
  args: {
    collectionId: v.id("collections"),
    entityType: v.string(),
    entityId: v.string(),
    annotation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const collection = await ctx.db.get(args.collectionId);
    verifyOwnership(collection, userId, "Collection");

    const newItems = collection.items.map((item) => {
      if (
        item.entityType === args.entityType &&
        item.entityId === args.entityId
      ) {
        return { ...item, annotation: args.annotation };
      }
      return item;
    });

    await ctx.db.patch(args.collectionId, {
      items: newItems,
      updatedAt: now(),
    });

    return args.collectionId;
  },
});

/**
 * Reorder items in a collection.
 */
export const reorderItems = mutation({
  args: {
    collectionId: v.id("collections"),
    items: v.array(
      v.object({
        entityType: v.string(),
        entityId: v.string(),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const collection = await ctx.db.get(args.collectionId);
    verifyOwnership(collection, userId, "Collection");

    // Create a map of new orders
    const orderMap = new Map(
      args.items.map((item) => [`${item.entityType}:${item.entityId}`, item.order])
    );

    // Update orders while preserving annotations
    const newItems = collection.items.map((item) => {
      const key = `${item.entityType}:${item.entityId}`;
      const newOrder = orderMap.get(key);
      if (newOrder !== undefined) {
        return { ...item, order: newOrder };
      }
      return item;
    });

    await ctx.db.patch(args.collectionId, {
      items: newItems.sort((a, b) => a.order - b.order),
      updatedAt: now(),
    });

    return args.collectionId;
  },
});

/**
 * Get all collections containing a specific entity.
 */
export const getCollectionsForEntity = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const allCollections = await ctx.db
      .query("collections")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return allCollections.filter((collection) =>
      collection.items.some(
        (item) =>
          item.entityType === args.entityType && item.entityId === args.entityId
      )
    );
  },
});
