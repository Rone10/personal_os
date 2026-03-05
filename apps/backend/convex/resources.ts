import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const studyEntityTypeValidator = v.union(
  v.literal("word"),
  v.literal("root"),
  v.literal("verse"),
  v.literal("hadith"),
  v.literal("course"),
  v.literal("lesson"),
  v.literal("book"),
  v.literal("chapter"),
  v.literal("note"),
  v.literal("tag"),
  v.literal("collection"),
  v.literal("vaultEntry"),
);

const defaultCategories: Array<{ name: string; color: string }> = [
  { name: "coding", color: "#2563eb" },
  { name: "arabic", color: "#0891b2" },
  { name: "quran", color: "#16a34a" },
];

const studyEntityTableMap = {
  word: "words",
  root: "roots",
  verse: "verses",
  hadith: "hadiths",
  course: "courses",
  lesson: "lessons",
  book: "books",
  chapter: "chapters",
  note: "studyNotes",
  tag: "tags",
  collection: "collections",
  vaultEntry: "vaultEntries",
} as const;

type StudyEntityType = keyof typeof studyEntityTableMap;

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function canonicalizeUrl(input: string): { raw: string; canonical: string } {
  const raw = input.trim();
  if (!raw) {
    throw new Error("URL is required");
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }

  parsed.hash = "";
  parsed.search = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  if (!parsed.pathname) {
    parsed.pathname = "/";
  }

  return {
    raw: parsed.toString(),
    canonical: parsed.toString(),
  };
}

function normalizeTags(tags: string[] | undefined): string[] | undefined {
  if (!tags) return undefined;
  const normalized = Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  return normalized.length > 0 ? normalized : undefined;
}

async function requireAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return identity.subject;
}

async function getAuthOrNull(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

async function ensureCategoryOwnership(
  ctx: any,
  userId: string,
  categoryId: Id<"resourceCategories">,
) {
  const category = await ctx.db.get(categoryId);
  if (!category || category.userId !== userId) {
    throw new Error("Unauthorized");
  }
  return category;
}

async function ensureResourceOwnership(
  ctx: any,
  userId: string,
  resourceId: Id<"resources">,
) {
  const resource = await ctx.db.get(resourceId);
  if (!resource || resource.userId !== userId) {
    throw new Error("Unauthorized");
  }
  return resource;
}

async function ensureProjectOwnership(
  ctx: any,
  userId: string,
  projectId: Id<"projects">,
) {
  const project = await ctx.db.get(projectId);
  if (!project || project.userId !== userId) {
    throw new Error("Unauthorized");
  }
  return project;
}

async function findOwnedStudyEntityById(
  ctx: any,
  userId: string,
  studyEntityType: StudyEntityType,
  studyEntityId: string,
) {
  const tableName = studyEntityTableMap[studyEntityType];
  const docs = await ctx.db
    .query(tableName as any)
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  return docs.find((doc: any) => doc._id === studyEntityId) ?? null;
}

async function ensureStudyEntityOwnership(
  ctx: any,
  userId: string,
  studyEntityType: StudyEntityType,
  studyEntityId: string,
) {
  const entity = await findOwnedStudyEntityById(ctx, userId, studyEntityType, studyEntityId);
  if (!entity) {
    throw new Error("Unauthorized");
  }
  return entity;
}

async function hydrateResourceLinks(ctx: any, links: any[]) {
  const hydrated = await Promise.all(
    links.map(async (link) => {
      const resource = await ctx.db.get(link.resourceId);
      if (!resource) return null;
      return resource;
    }),
  );

  const map = new Map<string, any>();
  for (const resource of hydrated) {
    if (resource) {
      map.set(resource._id, resource);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export const seedDefaultCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const timestamp = Date.now();

    const categories = await ctx.db
      .query("resourceCategories")
      .withIndex("by_user_order", (q) => q.eq("userId", userId))
      .collect();
    let nextOrder = Math.max(0, ...categories.map((category) => category.order));

    for (const category of defaultCategories) {
      const slug = slugify(category.name);
      const existing = await ctx.db
        .query("resourceCategories")
        .withIndex("by_user_slug", (q) => q.eq("userId", userId).eq("slug", slug))
        .first();

      if (!existing) {
        nextOrder += 1;
        await ctx.db.insert("resourceCategories", {
          userId,
          name: category.name,
          slug,
          color: category.color,
          isDefault: true,
          order: nextOrder,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }
  },
});

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthOrNull(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("resourceCategories")
      .withIndex("by_user_order", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const createCategory = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const name = args.name.trim().toLowerCase();
    if (!name) {
      throw new Error("Category name cannot be empty");
    }

    const slug = slugify(name);
    if (!slug) {
      throw new Error("Invalid category name");
    }

    const existing = await ctx.db
      .query("resourceCategories")
      .withIndex("by_user_slug", (q) => q.eq("userId", userId).eq("slug", slug))
      .first();

    if (existing) {
      throw new Error("Category already exists");
    }

    const categories = await ctx.db
      .query("resourceCategories")
      .withIndex("by_user_order", (q) => q.eq("userId", userId))
      .collect();
    const maxOrder = Math.max(0, ...categories.map((category) => category.order));
    const timestamp = Date.now();

    return await ctx.db.insert("resourceCategories", {
      userId,
      name,
      slug,
      color: args.color?.trim() || undefined,
      isDefault: false,
      order: maxOrder + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const updateCategory = mutation({
  args: {
    id: v.id("resourceCategories"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const category = await ensureCategoryOwnership(ctx, userId, args.id);
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.name !== undefined) {
      const nextName = args.name.trim().toLowerCase();
      if (!nextName) throw new Error("Category name cannot be empty");
      const nextSlug = slugify(nextName);
      if (!nextSlug) throw new Error("Invalid category name");

      const duplicate = await ctx.db
        .query("resourceCategories")
        .withIndex("by_user_slug", (q) => q.eq("userId", userId).eq("slug", nextSlug))
        .first();
      if (duplicate && duplicate._id !== category._id) {
        throw new Error("Category already exists");
      }

      updates.name = nextName;
      updates.slug = nextSlug;
    }

    if (args.color !== undefined) {
      updates.color = args.color.trim() || undefined;
    }

    if (args.order !== undefined) {
      updates.order = args.order;
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const removeCategory = mutation({
  args: {
    id: v.id("resourceCategories"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await ensureCategoryOwnership(ctx, userId, args.id);

    const topics = await ctx.db
      .query("resources")
      .withIndex("by_user_category", (q) => q.eq("userId", userId).eq("categoryId", args.id))
      .collect();

    if (topics.length > 0) {
      throw new Error("CATEGORY_IN_USE");
    }

    await ctx.db.delete(args.id);
  },
});

export const listTopics = query({
  args: {
    search: v.optional(v.string()),
    categoryId: v.optional(v.id("resourceCategories")),
    tag: v.optional(v.string()),
    favoriteOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthOrNull(ctx);
    if (!userId) return [];

    const search = args.search?.trim().toLowerCase();
    const tag = args.tag?.trim().toLowerCase();
    const topics = await ctx.db
      .query("resources")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const filtered = topics.filter((topic) => {
      if (args.categoryId && topic.categoryId !== args.categoryId) return false;
      if (args.favoriteOnly && !topic.isFavorite) return false;
      if (tag && !topic.tags?.includes(tag)) return false;
      if (search) {
        const inTitle = topic.title.toLowerCase().includes(search);
        const inDescription = topic.description?.toLowerCase().includes(search) ?? false;
        const inTags = topic.tags?.some((item) => item.includes(search)) ?? false;
        if (!inTitle && !inDescription && !inTags) return false;
      }
      return true;
    });

    return await Promise.all(
      filtered.map(async (topic) => {
        const category = await ctx.db.get(topic.categoryId);
        const entries = await ctx.db
          .query("resourceEntries")
          .withIndex("by_user_resource", (q) =>
            q.eq("userId", userId).eq("resourceId", topic._id),
          )
          .collect();

        return {
          ...topic,
          category,
          entriesCount: entries.length,
        };
      }),
    );
  },
});

export const getTopicDetail = query({
  args: {
    id: v.id("resources"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthOrNull(ctx);
    if (!userId) return null;

    const resource = await ctx.db.get(args.id);
    if (!resource || resource.userId !== userId) return null;

    const category = await ctx.db.get(resource.categoryId);
    const entries = await ctx.db
      .query("resourceEntries")
      .withIndex("by_resource_order", (q) => q.eq("resourceId", resource._id))
      .collect();
    const links = await ctx.db
      .query("resourceTargetLinks")
      .withIndex("by_user_resource", (q) =>
        q.eq("userId", userId).eq("resourceId", resource._id),
      )
      .collect();

    const projectLinks = await Promise.all(
      links
        .filter((link) => link.targetScope === "project" && link.projectId)
        .map(async (link) => {
          const project = await ctx.db.get(link.projectId!);
          return project
            ? {
                ...link,
                project,
              }
            : null;
        }),
    );

    const studyLinks = await Promise.all(
      links
        .filter((link) => link.targetScope === "study" && link.studyEntityType && link.studyEntityId)
        .map(async (link) => {
          const tableName = studyEntityTableMap[link.studyEntityType as StudyEntityType];
          if (!tableName) return null;

          const entities = await ctx.db
            .query(tableName as any)
            .withIndex("by_user", (q: any) => q.eq("userId", userId))
            .collect();
          const entity = entities.find((doc: any) => doc._id === link.studyEntityId) ?? null;
          if (!entity) return null;
          return {
            ...link,
            entity,
          };
        }),
    );

    return {
      resource,
      category,
      entries,
      projectLinks: projectLinks.filter(Boolean),
      studyLinks: studyLinks.filter(Boolean),
    };
  },
});

export const createTopic = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    categoryId: v.id("resourceCategories"),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const title = args.title.trim();
    if (!title) {
      throw new Error("Topic title cannot be empty");
    }

    await ensureCategoryOwnership(ctx, userId, args.categoryId);
    const timestamp = Date.now();
    return await ctx.db.insert("resources", {
      userId,
      title,
      description: args.description?.trim() || undefined,
      categoryId: args.categoryId,
      tags: normalizeTags(args.tags),
      isFavorite: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const updateTopic = mutation({
  args: {
    id: v.id("resources"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("resourceCategories")),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await ensureResourceOwnership(ctx, userId, args.id);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.title !== undefined) {
      const title = args.title.trim();
      if (!title) throw new Error("Topic title cannot be empty");
      updates.title = title;
    }
    if (args.description !== undefined) {
      updates.description = args.description.trim() || undefined;
    }
    if (args.categoryId !== undefined) {
      await ensureCategoryOwnership(ctx, userId, args.categoryId);
      updates.categoryId = args.categoryId;
    }
    if (args.tags !== undefined) {
      updates.tags = normalizeTags(args.tags);
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const removeTopic = mutation({
  args: {
    id: v.id("resources"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await ensureResourceOwnership(ctx, userId, args.id);

    const entries = await ctx.db
      .query("resourceEntries")
      .withIndex("by_user_resource", (q) => q.eq("userId", userId).eq("resourceId", args.id))
      .collect();
    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }

    const links = await ctx.db
      .query("resourceTargetLinks")
      .withIndex("by_user_resource", (q) => q.eq("userId", userId).eq("resourceId", args.id))
      .collect();
    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const toggleFavorite = mutation({
  args: {
    id: v.id("resources"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const resource = await ensureResourceOwnership(ctx, userId, args.id);
    await ctx.db.patch(args.id, {
      isFavorite: !resource.isFavorite,
      updatedAt: Date.now(),
    });
  },
});

export const findDuplicateEntries = query({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthOrNull(ctx);
    if (!userId) return [];

    const { canonical } = canonicalizeUrl(args.url);
    const entries = await ctx.db
      .query("resourceEntries")
      .withIndex("by_user_canonicalUrl", (q) =>
        q.eq("userId", userId).eq("canonicalUrl", canonical),
      )
      .collect();

    return await Promise.all(
      entries.map(async (entry) => {
        const resource = await ctx.db.get(entry.resourceId);
        return {
          ...entry,
          resourceTitle: resource?.title ?? "Unknown topic",
          resourceId: entry.resourceId,
        };
      }),
    );
  },
});

export const addEntry = mutation({
  args: {
    resourceId: v.id("resources"),
    url: v.string(),
    label: v.string(),
    purpose: v.string(),
    allowDuplicate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const resource = await ensureResourceOwnership(ctx, userId, args.resourceId);
    const label = args.label.trim();
    const purpose = args.purpose.trim();
    if (!label) throw new Error("Label is required");
    if (!purpose) throw new Error("Purpose is required");

    const { raw, canonical } = canonicalizeUrl(args.url);
    const duplicates = await ctx.db
      .query("resourceEntries")
      .withIndex("by_user_canonicalUrl", (q) =>
        q.eq("userId", userId).eq("canonicalUrl", canonical),
      )
      .collect();

    if (duplicates.length > 0 && !args.allowDuplicate) {
      throw new Error("DUPLICATE_URL");
    }

    const entries = await ctx.db
      .query("resourceEntries")
      .withIndex("by_resource_order", (q) => q.eq("resourceId", resource._id))
      .collect();
    const maxOrder = Math.max(-1, ...entries.map((entry) => entry.order));
    const timestamp = Date.now();

    return await ctx.db.insert("resourceEntries", {
      userId,
      resourceId: resource._id,
      url: raw,
      canonicalUrl: canonical,
      label,
      purpose,
      order: maxOrder + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const updateEntry = mutation({
  args: {
    id: v.id("resourceEntries"),
    url: v.optional(v.string()),
    label: v.optional(v.string()),
    purpose: v.optional(v.string()),
    allowDuplicate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const entry = await ctx.db.get(args.id);
    if (!entry || entry.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.url !== undefined) {
      const { raw, canonical } = canonicalizeUrl(args.url);
      const duplicates = await ctx.db
        .query("resourceEntries")
        .withIndex("by_user_canonicalUrl", (q) =>
          q.eq("userId", userId).eq("canonicalUrl", canonical),
        )
        .collect();
      const hasOtherDuplicate = duplicates.some((duplicate) => duplicate._id !== entry._id);
      if (hasOtherDuplicate && !args.allowDuplicate) {
        throw new Error("DUPLICATE_URL");
      }
      updates.url = raw;
      updates.canonicalUrl = canonical;
    }

    if (args.label !== undefined) {
      const label = args.label.trim();
      if (!label) throw new Error("Label is required");
      updates.label = label;
    }

    if (args.purpose !== undefined) {
      const purpose = args.purpose.trim();
      if (!purpose) throw new Error("Purpose is required");
      updates.purpose = purpose;
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const removeEntry = mutation({
  args: {
    id: v.id("resourceEntries"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const entry = await ctx.db.get(args.id);
    if (!entry || entry.userId !== userId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.delete(args.id);
  },
});

export const reorderEntries = mutation({
  args: {
    resourceId: v.id("resources"),
    entryIds: v.array(v.id("resourceEntries")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await ensureResourceOwnership(ctx, userId, args.resourceId);

    const entries = await ctx.db
      .query("resourceEntries")
      .withIndex("by_user_resource", (q) =>
        q.eq("userId", userId).eq("resourceId", args.resourceId),
      )
      .collect();
    const entryMap = new Map(entries.map((entry) => [entry._id, entry]));

    if (entries.length !== args.entryIds.length) {
      throw new Error("Invalid reorder payload");
    }

    for (const entryId of args.entryIds) {
      if (!entryMap.has(entryId)) {
        throw new Error("Invalid entry id in reorder payload");
      }
    }

    for (let index = 0; index < args.entryIds.length; index += 1) {
      await ctx.db.patch(args.entryIds[index], { order: index, updatedAt: Date.now() });
    }

    return args.resourceId;
  },
});

export const listForProject = query({
  args: {
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthOrNull(ctx);
    if (!userId) return [];

    const project = await ctx.db.get(args.projectId as any);
    if (!project || project.userId !== userId) {
      return [];
    }

    const links = await ctx.db
      .query("resourceTargetLinks")
      .withIndex("by_project", (q) =>
        q.eq("userId", userId).eq("projectId", args.projectId as any),
      )
      .collect();
    return await hydrateResourceLinks(ctx, links);
  },
});

export const listForStudyEntity = query({
  args: {
    studyEntityType: studyEntityTypeValidator,
    studyEntityId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthOrNull(ctx);
    if (!userId) return [];

    const entity = await findOwnedStudyEntityById(
      ctx,
      userId,
      args.studyEntityType as StudyEntityType,
      args.studyEntityId,
    );
    if (!entity) {
      return [];
    }

    const links = await ctx.db
      .query("resourceTargetLinks")
      .withIndex("by_study_target", (q) =>
        q
          .eq("userId", userId)
          .eq("studyEntityType", args.studyEntityType)
          .eq("studyEntityId", args.studyEntityId),
      )
      .collect();
    return await hydrateResourceLinks(ctx, links);
  },
});

export const linkToProject = mutation({
  args: {
    resourceId: v.id("resources"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await ensureResourceOwnership(ctx, userId, args.resourceId);
    await ensureProjectOwnership(ctx, userId, args.projectId);

    const existing = await ctx.db
      .query("resourceTargetLinks")
      .withIndex("by_user_resource", (q) =>
        q.eq("userId", userId).eq("resourceId", args.resourceId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("targetScope"), "project"),
          q.eq(q.field("projectId"), args.projectId),
        ),
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("resourceTargetLinks", {
      userId,
      resourceId: args.resourceId,
      targetScope: "project",
      projectId: args.projectId,
      createdAt: Date.now(),
    });
  },
});

export const unlinkFromProject = mutation({
  args: {
    resourceId: v.id("resources"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await ensureResourceOwnership(ctx, userId, args.resourceId);
    await ensureProjectOwnership(ctx, userId, args.projectId);

    const links = await ctx.db
      .query("resourceTargetLinks")
      .withIndex("by_user_resource", (q) =>
        q.eq("userId", userId).eq("resourceId", args.resourceId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("targetScope"), "project"),
          q.eq(q.field("projectId"), args.projectId),
        ),
      )
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }
  },
});

export const linkToStudyEntity = mutation({
  args: {
    resourceId: v.id("resources"),
    studyEntityType: studyEntityTypeValidator,
    studyEntityId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await ensureResourceOwnership(ctx, userId, args.resourceId);
    await ensureStudyEntityOwnership(
      ctx,
      userId,
      args.studyEntityType as StudyEntityType,
      args.studyEntityId,
    );

    const existing = await ctx.db
      .query("resourceTargetLinks")
      .withIndex("by_user_resource", (q) =>
        q.eq("userId", userId).eq("resourceId", args.resourceId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("targetScope"), "study"),
          q.eq(q.field("studyEntityType"), args.studyEntityType),
          q.eq(q.field("studyEntityId"), args.studyEntityId),
        ),
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("resourceTargetLinks", {
      userId,
      resourceId: args.resourceId,
      targetScope: "study",
      studyEntityType: args.studyEntityType,
      studyEntityId: args.studyEntityId,
      createdAt: Date.now(),
    });
  },
});

export const unlinkFromStudyEntity = mutation({
  args: {
    resourceId: v.id("resources"),
    studyEntityType: studyEntityTypeValidator,
    studyEntityId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await ensureResourceOwnership(ctx, userId, args.resourceId);
    await ensureStudyEntityOwnership(
      ctx,
      userId,
      args.studyEntityType as StudyEntityType,
      args.studyEntityId,
    );

    const links = await ctx.db
      .query("resourceTargetLinks")
      .withIndex("by_user_resource", (q) =>
        q.eq("userId", userId).eq("resourceId", args.resourceId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("targetScope"), "study"),
          q.eq(q.field("studyEntityType"), args.studyEntityType),
          q.eq(q.field("studyEntityId"), args.studyEntityId),
        ),
      )
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }
  },
});

export const searchStudyEntities = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthOrNull(ctx);
    if (!userId) return [];

    const normalizedQuery = args.query.trim().toLowerCase();
    if (!normalizedQuery) return [];
    const limit = Math.max(1, Math.min(args.limit ?? 20, 100));

    const matches: Array<{
      type: StudyEntityType;
      id: string;
      displayText: string;
      subtitle?: string;
    }> = [];

    function pushMatch(item: {
      type: StudyEntityType;
      id: string;
      displayText: string;
      subtitle?: string;
    }) {
      if (matches.length < limit) {
        matches.push(item);
      }
    }

    const words = await ctx.db
      .query("words")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const word of words) {
      if (matches.length >= limit) break;
      const inText = word.text.toLowerCase().includes(normalizedQuery);
      const inMeaning = word.meanings.some((meaning) =>
        meaning.definition.toLowerCase().includes(normalizedQuery),
      );
      if (inText || inMeaning) {
        pushMatch({
          type: "word",
          id: word._id,
          displayText: word.text,
          subtitle: word.meanings[0]?.definition,
        });
      }
    }

    const roots = await ctx.db
      .query("roots")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const root of roots) {
      if (matches.length >= limit) break;
      if (
        root.letters.toLowerCase().includes(normalizedQuery) ||
        root.latinized.toLowerCase().includes(normalizedQuery) ||
        root.coreMeaning.toLowerCase().includes(normalizedQuery)
      ) {
        pushMatch({
          type: "root",
          id: root._id,
          displayText: root.letters,
          subtitle: root.coreMeaning,
        });
      }
    }

    const verses = await ctx.db
      .query("verses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const verse of verses) {
      if (matches.length >= limit) break;
      const ref = `${verse.surahNumber}:${verse.ayahStart}${verse.ayahEnd ? `-${verse.ayahEnd}` : ""}`;
      if (
        verse.arabicText.toLowerCase().includes(normalizedQuery) ||
        ref.includes(normalizedQuery)
      ) {
        pushMatch({
          type: "verse",
          id: verse._id,
          displayText: ref,
          subtitle: verse.arabicText.slice(0, 60),
        });
      }
    }

    const hadiths = await ctx.db
      .query("hadiths")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const hadith of hadiths) {
      if (matches.length >= limit) break;
      const ref = `${hadith.collection} #${hadith.hadithNumber}`;
      if (
        hadith.collection.toLowerCase().includes(normalizedQuery) ||
        hadith.arabicText.toLowerCase().includes(normalizedQuery) ||
        ref.toLowerCase().includes(normalizedQuery)
      ) {
        pushMatch({
          type: "hadith",
          id: hadith._id,
          displayText: ref,
          subtitle: hadith.translation?.slice(0, 60),
        });
      }
    }

    const courses = await ctx.db
      .query("courses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const course of courses) {
      if (matches.length >= limit) break;
      if (course.title.toLowerCase().includes(normalizedQuery)) {
        pushMatch({ type: "course", id: course._id, displayText: course.title });
      }
    }

    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const lesson of lessons) {
      if (matches.length >= limit) break;
      if (lesson.title.toLowerCase().includes(normalizedQuery)) {
        pushMatch({ type: "lesson", id: lesson._id, displayText: lesson.title });
      }
    }

    const books = await ctx.db
      .query("books")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const book of books) {
      if (matches.length >= limit) break;
      if (book.title.toLowerCase().includes(normalizedQuery)) {
        pushMatch({
          type: "book",
          id: book._id,
          displayText: book.title,
          subtitle: book.author,
        });
      }
    }

    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const chapter of chapters) {
      if (matches.length >= limit) break;
      if (chapter.title.toLowerCase().includes(normalizedQuery)) {
        pushMatch({ type: "chapter", id: chapter._id, displayText: chapter.title });
      }
    }

    const notes = await ctx.db
      .query("studyNotes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const note of notes) {
      if (matches.length >= limit) break;
      const title = note.title ?? "";
      if (
        title.toLowerCase().includes(normalizedQuery) ||
        note.content.toLowerCase().includes(normalizedQuery)
      ) {
        pushMatch({
          type: "note",
          id: note._id,
          displayText: title || "Untitled Note",
          subtitle: note.content.slice(0, 60),
        });
      }
    }

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const tag of tags) {
      if (matches.length >= limit) break;
      if (tag.name.toLowerCase().includes(normalizedQuery)) {
        pushMatch({ type: "tag", id: tag._id, displayText: `#${tag.name}` });
      }
    }

    const collections = await ctx.db
      .query("collections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const collection of collections) {
      if (matches.length >= limit) break;
      if (collection.title.toLowerCase().includes(normalizedQuery)) {
        pushMatch({
          type: "collection",
          id: collection._id,
          displayText: collection.title,
        });
      }
    }

    const vaultEntries = await ctx.db
      .query("vaultEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const vaultEntry of vaultEntries) {
      if (matches.length >= limit) break;
      if (
        vaultEntry.text.toLowerCase().includes(normalizedQuery) ||
        vaultEntry.normalizedText.toLowerCase().includes(normalizedQuery)
      ) {
        pushMatch({
          type: "vaultEntry",
          id: vaultEntry._id,
          displayText: vaultEntry.text,
          subtitle: vaultEntry.entryType,
        });
      }
    }

    return matches.slice(0, limit);
  },
});
