/**
 * Arabic Knowledge Vault CRUD
 * Table-first entry system for Arabic words/phrases with taxonomy and references.
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { normalizeArabic } from "../_lib/arabic";
import { now, requireAuth, verifyOwnership } from "./_helpers";

const entryTypeValidator = v.union(v.literal("word"), v.literal("phrase"));

const internalTargetTypeValidator = v.union(
  v.literal("word"),
  v.literal("verse"),
  v.literal("hadith"),
  v.literal("lesson"),
  v.literal("chapter"),
  v.literal("root"),
  v.literal("tag"),
  v.literal("course"),
  v.literal("book"),
  v.literal("note"),
  v.literal("collection"),
  v.literal("topic"),
  v.literal("vaultEntry")
);

const referenceTypeValidator = v.union(
  v.literal("internal"),
  v.literal("external")
);

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function isValidUrl(input: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

function getReferenceTableName(targetType: string): string {
  switch (targetType) {
    case "word":
      return "words";
    case "verse":
      return "verses";
    case "hadith":
      return "hadiths";
    case "lesson":
      return "lessons";
    case "chapter":
      return "chapters";
    case "root":
      return "roots";
    case "tag":
      return "tags";
    case "course":
      return "courses";
    case "book":
      return "books";
    case "note":
      return "studyNotes";
    case "collection":
      return "collections";
    case "topic":
      return "topics";
    case "vaultEntry":
      return "vaultEntries";
    default:
      throw new Error(`Unsupported target type: ${targetType}`);
  }
}

async function ensureUniqueSlug(
  ctx: any,
  tableName: "vaultSubjects" | "vaultCategories" | "vaultTopics",
  userId: string,
  slug: string,
  currentId?: string
) {
  const existing = await ctx.db
    .query(tableName)
    .withIndex("by_user_slug", (q: any) =>
      q.eq("userId", userId).eq("slug", slug)
    )
    .first();

  if (existing && existing._id !== currentId) {
    throw new Error("A taxonomy item with this name already exists");
  }
}

async function ensureReferenceTargetOwnership(
  ctx: any,
  userId: string,
  targetType: string,
  targetId: string
) {
  getReferenceTableName(targetType);
  const target = await ctx.db.get(targetId as any);
  if (!target) {
    throw new Error("Referenced entity not found");
  }
  if (target.userId !== userId) {
    throw new Error("Unauthorized reference target");
  }
  return target;
}

async function hydrateVaultReference(ctx: any, reference: any) {
  if (
    reference.referenceType !== "internal" ||
    !reference.targetType ||
    !reference.targetId
  ) {
    return { ...reference, target: null };
  }

  const target = await ctx.db.get(reference.targetId as any);
  return { ...reference, target };
}

async function validateTaxonomyChain(
  ctx: any,
  userId: string,
  subjectId: any,
  categoryId: any,
  topicId: any
) {
  const subject = await ctx.db.get(subjectId);
  verifyOwnership(subject, userId, "Vault subject");

  const category = await ctx.db.get(categoryId);
  verifyOwnership(category, userId, "Vault category");
  if (category.subjectId !== subjectId) {
    throw new Error("Category does not belong to selected subject");
  }

  const topic = await ctx.db.get(topicId);
  verifyOwnership(topic, userId, "Vault topic");
  if (topic.categoryId !== categoryId || topic.subjectId !== subjectId) {
    throw new Error("Topic does not belong to selected category/subject");
  }

  return { subject, category, topic };
}

async function validateSourceChain(
  ctx: any,
  userId: string,
  bookId?: any,
  chapterId?: any
) {
  if (bookId) {
    const book = await ctx.db.get(bookId);
    verifyOwnership(book, userId, "Book");
  }

  if (!chapterId) {
    return;
  }

  const chapter = await ctx.db.get(chapterId);
  verifyOwnership(chapter, userId, "Chapter");

  if (!bookId) {
    throw new Error("Book is required when chapter is provided");
  }

  if (chapter.bookId !== bookId) {
    throw new Error("Chapter does not belong to selected book");
  }
}

async function syncEntryTags(
  ctx: any,
  userId: string,
  entryId: string,
  tags: string[]
) {
  const uniqueTagIds = [...new Set(tags.map((tagId) => String(tagId)))];

  const existingEntityTags = await ctx.db
    .query("entityTags")
    .withIndex("by_entity", (q: any) =>
      q.eq("entityType", "vaultEntry").eq("entityId", entryId)
    )
    .collect();

  const existingForUser = existingEntityTags.filter(
    (item: any) => item.userId === userId
  );
  const existingTagIds = new Set(
    existingForUser.map((item: any) => String(item.tagId))
  );
  const nextTagIds = new Set(uniqueTagIds);

  for (const entityTag of existingForUser) {
    if (!nextTagIds.has(String(entityTag.tagId))) {
      await ctx.db.delete(entityTag._id);
    }
  }

  for (const tagId of uniqueTagIds) {
    const tag = await ctx.db.get(tagId as any);
    verifyOwnership(tag, userId, "Tag");

    if (!existingTagIds.has(tagId)) {
      await ctx.db.insert("entityTags", {
        userId,
        tagId: tagId as any,
        entityType: "vaultEntry",
        entityId: entryId,
      });
    }
  }
}

// ============================================================================
// TAXONOMY: SUBJECTS
// ============================================================================

export const listSubjects = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("vaultSubjects")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const createSubject = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const timestamp = now();
    const slug = slugify(args.name);

    if (!slug) {
      throw new Error("Invalid subject name");
    }

    await ensureUniqueSlug(ctx, "vaultSubjects", userId, slug);

    const subjects = await ctx.db
      .query("vaultSubjects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const maxOrder = Math.max(0, ...subjects.map((item: any) => item.order));

    return await ctx.db.insert("vaultSubjects", {
      userId,
      name: args.name.trim(),
      slug,
      order: maxOrder + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const updateSubject = mutation({
  args: {
    id: v.id("vaultSubjects"),
    name: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const subject = await ctx.db.get(args.id);
    verifyOwnership(subject, userId, "Vault subject");

    const updates: Record<string, unknown> = { updatedAt: now() };

    if (args.name !== undefined) {
      const nextName = args.name.trim();
      const nextSlug = slugify(nextName);
      if (!nextSlug) {
        throw new Error("Invalid subject name");
      }
      await ensureUniqueSlug(ctx, "vaultSubjects", userId, nextSlug, subject._id);
      updates.name = nextName;
      updates.slug = nextSlug;
    }

    if (args.order !== undefined) {
      updates.order = args.order;
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const removeSubject = mutation({
  args: { id: v.id("vaultSubjects") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const subject = await ctx.db.get(args.id);
    verifyOwnership(subject, userId, "Vault subject");

    const categories = await ctx.db
      .query("vaultCategories")
      .withIndex("by_subject", (q) => q.eq("subjectId", args.id))
      .collect();
    if (categories.length > 0) {
      throw new Error("Cannot delete subject with existing categories");
    }

    const entries = await ctx.db
      .query("vaultEntries")
      .withIndex("by_user_subject", (q) =>
        q.eq("userId", userId).eq("subjectId", args.id)
      )
      .collect();
    if (entries.length > 0) {
      throw new Error("Cannot delete subject with existing entries");
    }

    await ctx.db.delete(args.id);
  },
});

// ============================================================================
// TAXONOMY: CATEGORIES
// ============================================================================

export const listCategories = query({
  args: {
    subjectId: v.optional(v.id("vaultSubjects")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.subjectId) {
      const subject = await ctx.db.get(args.subjectId);
      if (!subject || subject.userId !== identity.subject) return [];

      return await ctx.db
        .query("vaultCategories")
        .withIndex("by_subject", (q) => q.eq("subjectId", args.subjectId!))
        .collect();
    }

    return await ctx.db
      .query("vaultCategories")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const createCategory = mutation({
  args: {
    subjectId: v.id("vaultSubjects"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const subject = await ctx.db.get(args.subjectId);
    verifyOwnership(subject, userId, "Vault subject");

    const slug = slugify(args.name);
    if (!slug) {
      throw new Error("Invalid category name");
    }
    await ensureUniqueSlug(ctx, "vaultCategories", userId, slug);

    const categories = await ctx.db
      .query("vaultCategories")
      .withIndex("by_subject", (q) => q.eq("subjectId", args.subjectId))
      .collect();
    const maxOrder = Math.max(0, ...categories.map((item: any) => item.order));

    const timestamp = now();
    return await ctx.db.insert("vaultCategories", {
      userId,
      subjectId: args.subjectId,
      name: args.name.trim(),
      slug,
      order: maxOrder + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const updateCategory = mutation({
  args: {
    id: v.id("vaultCategories"),
    name: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const category = await ctx.db.get(args.id);
    verifyOwnership(category, userId, "Vault category");

    const updates: Record<string, unknown> = { updatedAt: now() };

    if (args.name !== undefined) {
      const nextName = args.name.trim();
      const nextSlug = slugify(nextName);
      if (!nextSlug) {
        throw new Error("Invalid category name");
      }
      await ensureUniqueSlug(
        ctx,
        "vaultCategories",
        userId,
        nextSlug,
        category._id
      );
      updates.name = nextName;
      updates.slug = nextSlug;
    }

    if (args.order !== undefined) {
      updates.order = args.order;
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const removeCategory = mutation({
  args: { id: v.id("vaultCategories") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const category = await ctx.db.get(args.id);
    verifyOwnership(category, userId, "Vault category");

    const topics = await ctx.db
      .query("vaultTopics")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .collect();
    if (topics.length > 0) {
      throw new Error("Cannot delete category with existing topics");
    }

    const entries = await ctx.db
      .query("vaultEntries")
      .withIndex("by_user_category", (q) =>
        q.eq("userId", userId).eq("categoryId", args.id)
      )
      .collect();
    if (entries.length > 0) {
      throw new Error("Cannot delete category with existing entries");
    }

    await ctx.db.delete(args.id);
  },
});

// ============================================================================
// TAXONOMY: TOPICS
// ============================================================================

export const listTopics = query({
  args: {
    subjectId: v.optional(v.id("vaultSubjects")),
    categoryId: v.optional(v.id("vaultCategories")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (!category || category.userId !== identity.subject) return [];

      return await ctx.db
        .query("vaultTopics")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!))
        .collect();
    }

    if (args.subjectId) {
      const subject = await ctx.db.get(args.subjectId);
      if (!subject || subject.userId !== identity.subject) return [];

      return await ctx.db
        .query("vaultTopics")
        .withIndex("by_subject", (q) => q.eq("subjectId", args.subjectId!))
        .collect();
    }

    return await ctx.db
      .query("vaultTopics")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const createTopic = mutation({
  args: {
    subjectId: v.id("vaultSubjects"),
    categoryId: v.id("vaultCategories"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const subject = await ctx.db.get(args.subjectId);
    verifyOwnership(subject, userId, "Vault subject");

    const category = await ctx.db.get(args.categoryId);
    verifyOwnership(category, userId, "Vault category");
    if (category.subjectId !== args.subjectId) {
      throw new Error("Category does not belong to selected subject");
    }

    const slug = slugify(args.name);
    if (!slug) {
      throw new Error("Invalid topic name");
    }
    await ensureUniqueSlug(ctx, "vaultTopics", userId, slug);

    const topics = await ctx.db
      .query("vaultTopics")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();
    const maxOrder = Math.max(0, ...topics.map((item: any) => item.order));

    const timestamp = now();
    return await ctx.db.insert("vaultTopics", {
      userId,
      subjectId: args.subjectId,
      categoryId: args.categoryId,
      name: args.name.trim(),
      slug,
      order: maxOrder + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const updateTopic = mutation({
  args: {
    id: v.id("vaultTopics"),
    name: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const topic = await ctx.db.get(args.id);
    verifyOwnership(topic, userId, "Vault topic");

    const updates: Record<string, unknown> = { updatedAt: now() };

    if (args.name !== undefined) {
      const nextName = args.name.trim();
      const nextSlug = slugify(nextName);
      if (!nextSlug) {
        throw new Error("Invalid topic name");
      }
      await ensureUniqueSlug(ctx, "vaultTopics", userId, nextSlug, topic._id);
      updates.name = nextName;
      updates.slug = nextSlug;
    }

    if (args.order !== undefined) {
      updates.order = args.order;
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const removeTopic = mutation({
  args: { id: v.id("vaultTopics") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const topic = await ctx.db.get(args.id);
    verifyOwnership(topic, userId, "Vault topic");

    const entries = await ctx.db
      .query("vaultEntries")
      .withIndex("by_user_topic", (q) =>
        q.eq("userId", userId).eq("topicId", args.id)
      )
      .collect();
    if (entries.length > 0) {
      throw new Error("Cannot delete topic with existing entries");
    }

    await ctx.db.delete(args.id);
  },
});

// ============================================================================
// ENTRIES
// ============================================================================

export const listEntries = query({
  args: {
    entryType: v.optional(entryTypeValidator),
    subjectId: v.optional(v.id("vaultSubjects")),
    categoryId: v.optional(v.id("vaultCategories")),
    topicId: v.optional(v.id("vaultTopics")),
    tagId: v.optional(v.id("tags")),
    bookId: v.optional(v.id("books")),
    chapterId: v.optional(v.id("chapters")),
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject;
    const limit = args.limit ?? 200;
    const normalizedQuery = args.query ? normalizeArabic(args.query).toLowerCase() : "";
    const rawQuery = args.query?.trim().toLowerCase() ?? "";

    let entries: any[] = [];

    if (args.topicId) {
      entries = await ctx.db
        .query("vaultEntries")
        .withIndex("by_user_topic", (q) =>
          q.eq("userId", userId).eq("topicId", args.topicId!)
        )
        .collect();
    } else if (args.categoryId) {
      entries = await ctx.db
        .query("vaultEntries")
        .withIndex("by_user_category", (q) =>
          q.eq("userId", userId).eq("categoryId", args.categoryId!)
        )
        .collect();
    } else if (args.subjectId) {
      entries = await ctx.db
        .query("vaultEntries")
        .withIndex("by_user_subject", (q) =>
          q.eq("userId", userId).eq("subjectId", args.subjectId!)
        )
        .collect();
    } else if (args.entryType) {
      entries = await ctx.db
        .query("vaultEntries")
        .withIndex("by_user_entryType", (q) =>
          q.eq("userId", userId).eq("entryType", args.entryType!)
        )
        .collect();
    } else if (args.chapterId) {
      entries = await ctx.db
        .query("vaultEntries")
        .withIndex("by_user_chapter", (q) =>
          q.eq("userId", userId).eq("chapterId", args.chapterId!)
        )
        .collect();
    } else if (args.bookId) {
      entries = await ctx.db
        .query("vaultEntries")
        .withIndex("by_user_book", (q) =>
          q.eq("userId", userId).eq("bookId", args.bookId!)
        )
        .collect();
    } else {
      entries = await ctx.db
        .query("vaultEntries")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    if (args.bookId && !args.chapterId) {
      entries = entries.filter((entry) => entry.bookId === args.bookId);
    }

    if (args.chapterId) {
      entries = entries.filter((entry) => entry.chapterId === args.chapterId);
    }

    if (rawQuery) {
      entries = entries.filter((entry) => {
        const transliteration = entry.transliteration?.toLowerCase() ?? "";
        return (
          entry.normalizedText.toLowerCase().includes(normalizedQuery) ||
          entry.text.toLowerCase().includes(rawQuery) ||
          transliteration.includes(rawQuery)
        );
      });
    }

    if (args.tagId) {
      const tagged = await ctx.db
        .query("entityTags")
        .withIndex("by_tag", (q) => q.eq("tagId", args.tagId!))
        .collect();
      const allowedEntryIds = new Set(
        tagged
          .filter((item) => item.userId === userId && item.entityType === "vaultEntry")
          .map((item) => String(item.entityId))
      );
      entries = entries.filter((entry) => allowedEntryIds.has(String(entry._id)));
    }

    entries.sort((a, b) => b.updatedAt - a.updatedAt);
    const limitedEntries = entries.slice(0, limit);

    const hydrated = await Promise.all(
      limitedEntries.map(async (entry) => {
        const [subject, category, topic, book, chapter, entityTags, refs] =
          await Promise.all([
            ctx.db.get(entry.subjectId),
            ctx.db.get(entry.categoryId),
            ctx.db.get(entry.topicId),
            entry.bookId ? ctx.db.get(entry.bookId) : null,
            entry.chapterId ? ctx.db.get(entry.chapterId) : null,
            ctx.db
              .query("entityTags")
              .withIndex("by_entity", (q: any) =>
                q.eq("entityType", "vaultEntry").eq("entityId", entry._id)
              )
              .collect(),
            ctx.db
              .query("vaultEntryReferences")
              .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
              .collect(),
          ]);

        const tags = await Promise.all(
          entityTags
            .filter((item: any) => item.userId === userId)
            .map((item: any) => ctx.db.get(item.tagId))
        );

        return {
          ...entry,
          subject,
          category,
          topic,
          book,
          chapter,
          tags: tags.filter(Boolean),
          referencesCount: refs.length,
        };
      })
    );

    return hydrated;
  },
});

export const getEntryDetail = query({
  args: { id: v.id("vaultEntries") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const entry = await ctx.db.get(args.id);
    if (!entry || entry.userId !== identity.subject) return null;

    const [subject, category, topic, book, chapter, entityTags, references] =
      await Promise.all([
        ctx.db.get(entry.subjectId),
        ctx.db.get(entry.categoryId),
        ctx.db.get(entry.topicId),
        entry.bookId ? ctx.db.get(entry.bookId) : null,
        entry.chapterId ? ctx.db.get(entry.chapterId) : null,
        ctx.db
          .query("entityTags")
          .withIndex("by_entity", (q: any) =>
            q.eq("entityType", "vaultEntry").eq("entityId", args.id)
          )
          .collect(),
        ctx.db
          .query("vaultEntryReferences")
          .withIndex("by_entry", (q) => q.eq("entryId", args.id))
          .collect(),
      ]);

    const tags = await Promise.all(
      entityTags
        .filter((item: any) => item.userId === identity.subject)
        .map((item: any) => ctx.db.get(item.tagId))
    );

    const hydratedReferences = await Promise.all(
      references.map((reference) => hydrateVaultReference(ctx, reference))
    );

    return {
      entry,
      subject,
      category,
      topic,
      book,
      chapter,
      tags: tags.filter(Boolean),
      references: hydratedReferences,
    };
  },
});

export const createEntry = mutation({
  args: {
    entryType: entryTypeValidator,
    text: v.string(),
    transliteration: v.optional(v.string()),
    subjectId: v.id("vaultSubjects"),
    categoryId: v.id("vaultCategories"),
    topicId: v.id("vaultTopics"),
    bookId: v.optional(v.id("books")),
    chapterId: v.optional(v.id("chapters")),
    sourcePage: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const text = args.text.trim();
    if (!text) {
      throw new Error("Text is required");
    }

    await validateTaxonomyChain(
      ctx,
      userId,
      args.subjectId,
      args.categoryId,
      args.topicId
    );
    await validateSourceChain(ctx, userId, args.bookId, args.chapterId);

    const timestamp = now();
    const entryId = await ctx.db.insert("vaultEntries", {
      userId,
      entryType: args.entryType,
      text,
      normalizedText: normalizeArabic(text),
      transliteration: args.transliteration?.trim() || undefined,
      subjectId: args.subjectId,
      categoryId: args.categoryId,
      topicId: args.topicId,
      bookId: args.bookId,
      chapterId: args.chapterId,
      sourcePage: args.sourcePage?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    if (args.tags && args.tags.length > 0) {
      await syncEntryTags(ctx, userId, entryId, args.tags as unknown as string[]);
    }

    return entryId;
  },
});

export const updateEntry = mutation({
  args: {
    id: v.id("vaultEntries"),
    entryType: v.optional(entryTypeValidator),
    text: v.optional(v.string()),
    transliteration: v.optional(v.string()),
    subjectId: v.optional(v.id("vaultSubjects")),
    categoryId: v.optional(v.id("vaultCategories")),
    topicId: v.optional(v.id("vaultTopics")),
    bookId: v.optional(v.union(v.id("books"), v.null())),
    chapterId: v.optional(v.union(v.id("chapters"), v.null())),
    sourcePage: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const entry = await ctx.db.get(args.id);
    verifyOwnership(entry, userId, "Vault entry");

    const nextSubjectId = args.subjectId ?? entry.subjectId;
    const nextCategoryId = args.categoryId ?? entry.categoryId;
    const nextTopicId = args.topicId ?? entry.topicId;
    await validateTaxonomyChain(
      ctx,
      userId,
      nextSubjectId,
      nextCategoryId,
      nextTopicId
    );

    const resolvedBookId =
      args.bookId === null ? undefined : args.bookId;
    const resolvedChapterId =
      args.chapterId === null ? undefined : args.chapterId;
    const shouldClearBook = args.bookId !== undefined && resolvedBookId === undefined;

    const nextBookId = args.bookId !== undefined ? resolvedBookId : entry.bookId;
    const nextChapterId =
      args.chapterId !== undefined
        ? resolvedChapterId
        : shouldClearBook
          ? undefined
          : entry.chapterId;
    await validateSourceChain(ctx, userId, nextBookId, nextChapterId);

    const updates: Record<string, unknown> = { updatedAt: now() };
    if (args.entryType !== undefined) updates.entryType = args.entryType;

    if (args.text !== undefined) {
      const text = args.text.trim();
      if (!text) {
        throw new Error("Text is required");
      }
      updates.text = text;
      updates.normalizedText = normalizeArabic(text);
    }

    if (args.transliteration !== undefined) {
      updates.transliteration = args.transliteration.trim() || undefined;
    }
    if (args.subjectId !== undefined) updates.subjectId = args.subjectId;
    if (args.categoryId !== undefined) updates.categoryId = args.categoryId;
    if (args.topicId !== undefined) updates.topicId = args.topicId;
    if (args.bookId !== undefined) updates.bookId = resolvedBookId;
    if (args.chapterId !== undefined || shouldClearBook) {
      updates.chapterId = nextChapterId;
    }
    if (args.sourcePage !== undefined) {
      updates.sourcePage = args.sourcePage.trim() || undefined;
    }
    if (args.notes !== undefined) {
      updates.notes = args.notes.trim() || undefined;
    }

    await ctx.db.patch(args.id, updates);

    if (args.tags !== undefined) {
      await syncEntryTags(ctx, userId, args.id, args.tags as unknown as string[]);
    }

    return args.id;
  },
});

export const removeEntry = mutation({
  args: { id: v.id("vaultEntries") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const entry = await ctx.db.get(args.id);
    verifyOwnership(entry, userId, "Vault entry");

    const references = await ctx.db
      .query("vaultEntryReferences")
      .withIndex("by_entry", (q) => q.eq("entryId", args.id))
      .collect();
    for (const reference of references) {
      await ctx.db.delete(reference._id);
    }

    const entityTags = await ctx.db
      .query("entityTags")
      .withIndex("by_entity", (q: any) =>
        q.eq("entityType", "vaultEntry").eq("entityId", args.id)
      )
      .collect();
    for (const entityTag of entityTags) {
      if (entityTag.userId === userId) {
        await ctx.db.delete(entityTag._id);
      }
    }

    await ctx.db.delete(args.id);
  },
});

// ============================================================================
// REFERENCES
// ============================================================================

export const listReferences = query({
  args: { entryId: v.id("vaultEntries") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== identity.subject) return [];

    const references = await ctx.db
      .query("vaultEntryReferences")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();

    return await Promise.all(
      references.map((reference) => hydrateVaultReference(ctx, reference))
    );
  },
});

export const createReference = mutation({
  args: {
    entryId: v.id("vaultEntries"),
    referenceType: referenceTypeValidator,
    targetType: v.optional(internalTargetTypeValidator),
    targetId: v.optional(v.string()),
    url: v.optional(v.string()),
    label: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const entry = await ctx.db.get(args.entryId);
    verifyOwnership(entry, userId, "Vault entry");

    if (!args.label.trim()) {
      throw new Error("Reference label is required");
    }

    if (args.referenceType === "internal") {
      if (!args.targetType || !args.targetId) {
        throw new Error("Internal references require target type and target ID");
      }
      await ensureReferenceTargetOwnership(
        ctx,
        userId,
        args.targetType,
        args.targetId
      );
    } else {
      if (!args.url || !isValidUrl(args.url)) {
        throw new Error("External references require a valid URL");
      }
    }

    const existingReferences = await ctx.db
      .query("vaultEntryReferences")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();
    const maxOrder = Math.max(0, ...existingReferences.map((item) => item.order));

    const timestamp = now();
    return await ctx.db.insert("vaultEntryReferences", {
      userId,
      entryId: args.entryId,
      referenceType: args.referenceType,
      targetType: args.targetType,
      targetId: args.targetId,
      url: args.url?.trim() || undefined,
      label: args.label.trim(),
      note: args.note?.trim() || undefined,
      order: maxOrder + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const updateReference = mutation({
  args: {
    id: v.id("vaultEntryReferences"),
    referenceType: v.optional(referenceTypeValidator),
    targetType: v.optional(internalTargetTypeValidator),
    targetId: v.optional(v.string()),
    url: v.optional(v.string()),
    label: v.optional(v.string()),
    note: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const reference = await ctx.db.get(args.id);
    verifyOwnership(reference, userId, "Vault entry reference");

    const nextReferenceType = args.referenceType ?? reference.referenceType;
    const nextTargetType = args.targetType ?? reference.targetType;
    const nextTargetId = args.targetId ?? reference.targetId;
    const nextUrl = args.url ?? reference.url;
    const nextLabel = args.label ?? reference.label;

    if (!nextLabel?.trim()) {
      throw new Error("Reference label is required");
    }

    if (nextReferenceType === "internal") {
      if (!nextTargetType || !nextTargetId) {
        throw new Error("Internal references require target type and target ID");
      }
      await ensureReferenceTargetOwnership(
        ctx,
        userId,
        nextTargetType,
        nextTargetId
      );
    } else {
      if (!nextUrl || !isValidUrl(nextUrl)) {
        throw new Error("External references require a valid URL");
      }
    }

    const updates: Record<string, unknown> = { updatedAt: now() };
    if (args.referenceType !== undefined) updates.referenceType = args.referenceType;
    if (args.targetType !== undefined) updates.targetType = args.targetType;
    if (args.targetId !== undefined) updates.targetId = args.targetId;
    if (args.url !== undefined) updates.url = args.url.trim() || undefined;
    if (args.label !== undefined) updates.label = args.label.trim();
    if (args.note !== undefined) updates.note = args.note.trim() || undefined;
    if (args.order !== undefined) updates.order = args.order;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const removeReference = mutation({
  args: { id: v.id("vaultEntryReferences") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const reference = await ctx.db.get(args.id);
    verifyOwnership(reference, userId, "Vault entry reference");
    await ctx.db.delete(args.id);
  },
});

export const reorderReferences = mutation({
  args: {
    entryId: v.id("vaultEntries"),
    items: v.array(
      v.object({
        id: v.id("vaultEntryReferences"),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const entry = await ctx.db.get(args.entryId);
    verifyOwnership(entry, userId, "Vault entry");

    for (const item of args.items) {
      const reference = await ctx.db.get(item.id);
      verifyOwnership(reference, userId, "Vault entry reference");
      if (reference.entryId !== args.entryId) {
        throw new Error("Reference does not belong to selected entry");
      }
      await ctx.db.patch(item.id, {
        order: item.order,
        updatedAt: now(),
      });
    }

    return args.entryId;
  },
});
