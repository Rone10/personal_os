/**
 * Books and Chapters CRUD
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, verifyOwnership, now } from "./_helpers";

// ============================================================================
// BOOKS
// ============================================================================

/**
 * List all books for the current user.
 */
export const listBooks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("books")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

/**
 * Get a single book by ID.
 */
export const getBook = query({
  args: { id: v.id("books") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const book = await ctx.db.get(args.id);
    if (!book || book.userId !== identity.subject) return null;
    return book;
  },
});

/**
 * Get book with its chapters.
 */
export const getBookWithChapters = query({
  args: { id: v.id("books") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const book = await ctx.db.get(args.id);
    if (!book || book.userId !== identity.subject) return null;

    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_book", (q) => q.eq("bookId", args.id))
      .collect();

    return { book, chapters };
  },
});

/**
 * Create a new book.
 */
export const createBook = mutation({
  args: {
    title: v.string(),
    author: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const timestamp = now();

    // Get max order for ordering
    const books = await ctx.db
      .query("books")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const maxOrder = Math.max(0, ...books.map((b) => b.order ?? 0));

    return await ctx.db.insert("books", {
      userId,
      title: args.title,
      author: args.author,
      description: args.description,
      order: maxOrder + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

/**
 * Update an existing book.
 */
export const updateBook = mutation({
  args: {
    id: v.id("books"),
    title: v.optional(v.string()),
    author: v.optional(v.string()),
    description: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const book = await ctx.db.get(args.id);
    verifyOwnership(book, userId, "Book");

    const updates: Record<string, unknown> = { updatedAt: now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.author !== undefined) updates.author = args.author;
    if (args.description !== undefined) updates.description = args.description;
    if (args.order !== undefined) updates.order = args.order;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete a book and all its chapters.
 */
export const removeBook = mutation({
  args: { id: v.id("books") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const book = await ctx.db.get(args.id);
    verifyOwnership(book, userId, "Book");

    // Delete all chapters in this book
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_book", (q) => q.eq("bookId", args.id))
      .collect();

    for (const chapter of chapters) {
      // Delete notes attached to this chapter
      const notes = await ctx.db
        .query("studyNotes")
        .withIndex("by_user_parent", (q) =>
          q.eq("userId", userId).eq("parentType", "chapter").eq("parentId", chapter._id)
        )
        .collect();
      for (const note of notes) {
        await ctx.db.delete(note._id);
      }

      // Delete entity tags for this chapter
      const entityTags = await ctx.db
        .query("entityTags")
        .withIndex("by_entity", (q) =>
          q.eq("entityType", "chapter").eq("entityId", chapter._id)
        )
        .collect();
      for (const et of entityTags) {
        await ctx.db.delete(et._id);
      }

      await ctx.db.delete(chapter._id);
    }

    await ctx.db.delete(args.id);
  },
});

// ============================================================================
// CHAPTERS
// ============================================================================

/**
 * List chapters for a book.
 */
export const listChapters = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify book ownership
    const book = await ctx.db.get(args.bookId);
    if (!book || book.userId !== identity.subject) return [];

    return await ctx.db
      .query("chapters")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();
  },
});

/**
 * Get a single chapter by ID.
 */
export const getChapter = query({
  args: { id: v.id("chapters") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const chapter = await ctx.db.get(args.id);
    if (!chapter || chapter.userId !== identity.subject) return null;
    return chapter;
  },
});

/**
 * Get chapter with its notes.
 */
export const getChapterWithNotes = query({
  args: { id: v.id("chapters") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const chapter = await ctx.db.get(args.id);
    if (!chapter || chapter.userId !== identity.subject) return null;

    const notes = await ctx.db
      .query("studyNotes")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", identity.subject).eq("parentType", "chapter").eq("parentId", args.id)
      )
      .collect();

    // Get parent book
    const book = await ctx.db.get(chapter.bookId);

    return { chapter, book, notes };
  },
});

/**
 * Create a new chapter.
 */
export const createChapter = mutation({
  args: {
    bookId: v.id("books"),
    title: v.string(),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify book ownership
    const book = await ctx.db.get(args.bookId);
    verifyOwnership(book, userId, "Book");

    const timestamp = now();

    // Get max order for this book
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();
    const maxOrder = Math.max(0, ...chapters.map((c) => c.order));

    return await ctx.db.insert("chapters", {
      userId,
      bookId: args.bookId,
      title: args.title,
      content: args.content,
      order: maxOrder + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

/**
 * Update an existing chapter.
 */
export const updateChapter = mutation({
  args: {
    id: v.id("chapters"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const chapter = await ctx.db.get(args.id);
    verifyOwnership(chapter, userId, "Chapter");

    const updates: Record<string, unknown> = { updatedAt: now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.order !== undefined) updates.order = args.order;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete a chapter.
 */
export const removeChapter = mutation({
  args: { id: v.id("chapters") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const chapter = await ctx.db.get(args.id);
    verifyOwnership(chapter, userId, "Chapter");

    // Delete notes attached to this chapter
    const notes = await ctx.db
      .query("studyNotes")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", userId).eq("parentType", "chapter").eq("parentId", args.id)
      )
      .collect();
    for (const note of notes) {
      await ctx.db.delete(note._id);
    }

    // Delete entity tags
    const entityTags = await ctx.db
      .query("entityTags")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "chapter").eq("entityId", args.id)
      )
      .collect();
    for (const et of entityTags) {
      await ctx.db.delete(et._id);
    }

    await ctx.db.delete(args.id);
  },
});
