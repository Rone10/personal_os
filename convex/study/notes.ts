/**
 * Notes CRUD with inline references and backlink maintenance
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, verifyOwnership, now } from "./_helpers";
import { extractSnippet } from "../_lib/arabic";

// Reference object validator
const referenceValidator = v.object({
  targetType: v.union(
    v.literal("word"),
    v.literal("verse"),
    v.literal("hadith"),
    v.literal("lesson"),
    v.literal("chapter"),
    v.literal("root")
  ),
  targetId: v.string(),
  startOffset: v.number(),
  endOffset: v.number(),
  displayText: v.string(),
});

// External link validator
const externalLinkValidator = v.object({
  url: v.string(),
  label: v.string(),
});

/**
 * List all notes for the current user.
 */
export const list = query({
  args: {
    parentType: v.optional(
      v.union(
        v.literal("lesson"),
        v.literal("chapter"),
        v.literal("verse"),
        v.literal("hadith"),
        v.literal("word")
      )
    ),
    parentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.parentType && args.parentId) {
      return await ctx.db
        .query("studyNotes")
        .withIndex("by_user_parent", (q) =>
          q
            .eq("userId", identity.subject)
            .eq("parentType", args.parentType!)
            .eq("parentId", args.parentId!)
        )
        .collect();
    }

    return await ctx.db
      .query("studyNotes")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

/**
 * Get a single note by ID.
 */
export const getById = query({
  args: { id: v.id("studyNotes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== identity.subject) return null;
    return note;
  },
});

/**
 * Get note with resolved references.
 */
export const getDetail = query({
  args: { id: v.id("studyNotes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== identity.subject) return null;

    // Resolve references to their entities
    const resolvedReferences = [];
    if (note.references) {
      for (const ref of note.references) {
        let entity = null;
        switch (ref.targetType) {
          case "word":
            entity = await ctx.db.get(ref.targetId as any);
            break;
          case "verse":
            entity = await ctx.db.get(ref.targetId as any);
            break;
          case "hadith":
            entity = await ctx.db.get(ref.targetId as any);
            break;
          case "lesson":
            entity = await ctx.db.get(ref.targetId as any);
            break;
          case "chapter":
            entity = await ctx.db.get(ref.targetId as any);
            break;
          case "root":
            entity = await ctx.db.get(ref.targetId as any);
            break;
        }
        resolvedReferences.push({ ...ref, entity });
      }
    }

    // Get tags
    const entityTags = await ctx.db
      .query("entityTags")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "note").eq("entityId", args.id)
      )
      .collect();

    const tags = await Promise.all(
      entityTags.map(async (et) => await ctx.db.get(et.tagId))
    );

    return {
      note,
      resolvedReferences,
      tags: tags.filter(Boolean),
    };
  },
});

/**
 * Create a new note.
 */
export const create = mutation({
  args: {
    title: v.optional(v.string()),
    content: v.string(),
    parentType: v.optional(
      v.union(
        v.literal("lesson"),
        v.literal("chapter"),
        v.literal("verse"),
        v.literal("hadith"),
        v.literal("word")
      )
    ),
    parentId: v.optional(v.string()),
    references: v.optional(v.array(referenceValidator)),
    externalLinks: v.optional(v.array(externalLinkValidator)),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const timestamp = now();

    const noteId = await ctx.db.insert("studyNotes", {
      userId,
      title: args.title,
      content: args.content,
      parentType: args.parentType,
      parentId: args.parentId,
      references: args.references,
      externalLinks: args.externalLinks,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // Create backlinks for references
    if (args.references) {
      await updateBacklinks(ctx, noteId, userId, args.content, args.references);
    }

    return noteId;
  },
});

/**
 * Update an existing note.
 */
export const update = mutation({
  args: {
    id: v.id("studyNotes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    parentType: v.optional(
      v.union(
        v.literal("lesson"),
        v.literal("chapter"),
        v.literal("verse"),
        v.literal("hadith"),
        v.literal("word")
      )
    ),
    parentId: v.optional(v.string()),
    references: v.optional(v.array(referenceValidator)),
    externalLinks: v.optional(v.array(externalLinkValidator)),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const note = await ctx.db.get(args.id);
    verifyOwnership(note, userId, "Note");

    const updates: Record<string, unknown> = { updatedAt: now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.parentType !== undefined) updates.parentType = args.parentType;
    if (args.parentId !== undefined) updates.parentId = args.parentId;
    if (args.references !== undefined) updates.references = args.references;
    if (args.externalLinks !== undefined) updates.externalLinks = args.externalLinks;

    await ctx.db.patch(args.id, updates);

    // Update backlinks if references changed
    if (args.references !== undefined) {
      const content = args.content ?? note.content;
      await updateBacklinks(ctx, args.id, userId, content, args.references);
    }

    return args.id;
  },
});

/**
 * Delete a note and its backlinks.
 */
export const remove = mutation({
  args: { id: v.id("studyNotes") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const note = await ctx.db.get(args.id);
    verifyOwnership(note, userId, "Note");

    // Delete backlinks for this note
    const backlinks = await ctx.db
      .query("backlinks")
      .withIndex("by_note", (q) => q.eq("noteId", args.id))
      .collect();
    for (const bl of backlinks) {
      await ctx.db.delete(bl._id);
    }

    // Delete entity tags
    const entityTags = await ctx.db
      .query("entityTags")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "note").eq("entityId", args.id)
      )
      .collect();
    for (const et of entityTags) {
      await ctx.db.delete(et._id);
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * Helper to update backlinks when note references change.
 */
async function updateBacklinks(
  ctx: any,
  noteId: any,
  userId: string,
  content: string,
  references: Array<{
    targetType: string;
    targetId: string;
    startOffset: number;
    endOffset: number;
    displayText: string;
  }>
) {
  // Delete existing backlinks for this note
  const existingBacklinks = await ctx.db
    .query("backlinks")
    .withIndex("by_note", (q: any) => q.eq("noteId", noteId))
    .collect();

  for (const bl of existingBacklinks) {
    await ctx.db.delete(bl._id);
  }

  // Create new backlinks
  for (const ref of references) {
    const snippet = extractSnippet(content, ref.startOffset, ref.endOffset, 50);

    await ctx.db.insert("backlinks", {
      userId,
      targetType: ref.targetType,
      targetId: ref.targetId,
      noteId,
      snippet,
      startOffset: ref.startOffset,
      endOffset: ref.endOffset,
    });
  }
}

/**
 * List standalone notes (not attached to any parent).
 */
export const listStandalone = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const allNotes = await ctx.db
      .query("studyNotes")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return allNotes.filter((n) => !n.parentType);
  },
});
