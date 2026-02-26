import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const ideaStatusValidator = v.union(
  v.literal("captured"),
  v.literal("worth_exploring"),
  v.literal("parked"),
);

async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return identity;
}

export const list = query({
  args: {
    status: v.optional(ideaStatusValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.status) {
      return await ctx.db
        .query("ideas")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", identity.subject).eq("status", args.status!),
        )
        .collect();
    }

    return await ctx.db
      .query("ideas")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("ideas") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const idea = await ctx.db.get(args.id);
    if (!idea || idea.userId !== identity.subject) return null;
    return idea;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    problemOneLiner: v.string(),
    status: v.optional(ideaStatusValidator),
    referenceUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const now = Date.now();

    return await ctx.db.insert("ideas", {
      userId: identity.subject,
      title: args.title,
      problemOneLiner: args.problemOneLiner,
      status: args.status ?? "captured",
      referenceUrl: args.referenceUrl,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("ideas"),
    title: v.optional(v.string()),
    problemOneLiner: v.optional(v.string()),
    status: v.optional(ideaStatusValidator),
    referenceUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const idea = await ctx.db.get(args.id);
    if (!idea || idea.userId !== identity.subject) throw new Error("Unauthorized");

    const patch: {
      title?: string;
      problemOneLiner?: string;
      status?: "captured" | "worth_exploring" | "parked";
      referenceUrl?: string;
      notes?: string;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) patch.title = args.title;
    if (args.problemOneLiner !== undefined) patch.problemOneLiner = args.problemOneLiner;
    if (args.status !== undefined) patch.status = args.status;
    if (args.referenceUrl !== undefined) patch.referenceUrl = args.referenceUrl;
    if (args.notes !== undefined) patch.notes = args.notes;

    await ctx.db.patch(args.id, patch);
    return args.id;
  },
});

export const getLinkedProjects = query({
  args: { ideaId: v.id("ideas") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const links = await ctx.db
      .query("ideaProjectLinks")
      .withIndex("by_idea", (q) => q.eq("ideaId", args.ideaId))
      .collect();

    const projects = await Promise.all(
      links.map(async (link) => {
        if (link.userId !== identity.subject) return null;
        const project = await ctx.db.get(link.projectId);
        if (!project || project.userId !== identity.subject) return null;
        return project;
      }),
    );

    return projects.filter((project): project is NonNullable<typeof project> => project !== null);
  },
});

export const getLinkedPrompts = query({
  args: { ideaId: v.id("ideas") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const links = await ctx.db
      .query("ideaPromptLinks")
      .withIndex("by_idea", (q) => q.eq("ideaId", args.ideaId))
      .collect();

    const prompts = await Promise.all(
      links.map(async (link) => {
        if (link.userId !== identity.subject) return null;
        const prompt = await ctx.db.get(link.promptId);
        if (!prompt || prompt.userId !== identity.subject) return null;
        return prompt;
      }),
    );

    return prompts.filter((prompt): prompt is NonNullable<typeof prompt> => prompt !== null);
  },
});

export const getLinkedIdeas = query({
  args: { ideaId: v.id("ideas") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const outgoing = await ctx.db
      .query("ideaLinks")
      .withIndex("by_from_idea", (q) => q.eq("fromIdeaId", args.ideaId))
      .collect();

    const incoming = await ctx.db
      .query("ideaLinks")
      .withIndex("by_to_idea", (q) => q.eq("toIdeaId", args.ideaId))
      .collect();

    const linkedIdeaIds = new Set<Id<"ideas">>();
    for (const link of [...outgoing, ...incoming]) {
      if (link.userId !== identity.subject) continue;
      if (link.fromIdeaId === args.ideaId) linkedIdeaIds.add(link.toIdeaId);
      if (link.toIdeaId === args.ideaId) linkedIdeaIds.add(link.fromIdeaId);
    }

    const linkedIdeas = await Promise.all(
      Array.from(linkedIdeaIds).map(async (id) => {
        const idea = await ctx.db.get(id);
        if (!idea || idea.userId !== identity.subject) return null;
        return idea;
      }),
    );

    return linkedIdeas.filter((idea): idea is NonNullable<typeof idea> => idea !== null);
  },
});

export const linkProject = mutation({
  args: {
    ideaId: v.id("ideas"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    const [idea, project] = await Promise.all([
      ctx.db.get(args.ideaId),
      ctx.db.get(args.projectId),
    ]);

    if (!idea || idea.userId !== identity.subject) throw new Error("Unauthorized");
    if (!project || project.userId !== identity.subject) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("ideaProjectLinks")
      .withIndex("by_idea", (q) => q.eq("ideaId", args.ideaId))
      .filter((q) => q.eq(q.field("projectId"), args.projectId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("ideaProjectLinks", {
      userId: identity.subject,
      ideaId: args.ideaId,
      projectId: args.projectId,
      createdAt: Date.now(),
    });
  },
});

export const unlinkProject = mutation({
  args: {
    ideaId: v.id("ideas"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    const link = await ctx.db
      .query("ideaProjectLinks")
      .withIndex("by_idea", (q) => q.eq("ideaId", args.ideaId))
      .filter((q) => q.eq(q.field("projectId"), args.projectId))
      .first();

    if (!link || link.userId !== identity.subject) return;
    await ctx.db.delete(link._id);
  },
});

export const linkPrompt = mutation({
  args: {
    ideaId: v.id("ideas"),
    promptId: v.id("prompts"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    const [idea, prompt] = await Promise.all([
      ctx.db.get(args.ideaId),
      ctx.db.get(args.promptId),
    ]);

    if (!idea || idea.userId !== identity.subject) throw new Error("Unauthorized");
    if (!prompt || prompt.userId !== identity.subject) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("ideaPromptLinks")
      .withIndex("by_idea", (q) => q.eq("ideaId", args.ideaId))
      .filter((q) => q.eq(q.field("promptId"), args.promptId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("ideaPromptLinks", {
      userId: identity.subject,
      ideaId: args.ideaId,
      promptId: args.promptId,
      createdAt: Date.now(),
    });
  },
});

export const unlinkPrompt = mutation({
  args: {
    ideaId: v.id("ideas"),
    promptId: v.id("prompts"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    const link = await ctx.db
      .query("ideaPromptLinks")
      .withIndex("by_idea", (q) => q.eq("ideaId", args.ideaId))
      .filter((q) => q.eq(q.field("promptId"), args.promptId))
      .first();

    if (!link || link.userId !== identity.subject) return;
    await ctx.db.delete(link._id);
  },
});

export const linkIdea = mutation({
  args: {
    fromIdeaId: v.id("ideas"),
    toIdeaId: v.id("ideas"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    if (args.fromIdeaId === args.toIdeaId) {
      throw new Error("Cannot link an idea to itself");
    }

    const [fromIdea, toIdea] = await Promise.all([
      ctx.db.get(args.fromIdeaId),
      ctx.db.get(args.toIdeaId),
    ]);

    if (!fromIdea || fromIdea.userId !== identity.subject) throw new Error("Unauthorized");
    if (!toIdea || toIdea.userId !== identity.subject) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("ideaLinks")
      .withIndex("by_from_idea", (q) => q.eq("fromIdeaId", args.fromIdeaId))
      .filter((q) => q.eq(q.field("toIdeaId"), args.toIdeaId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("ideaLinks", {
      userId: identity.subject,
      fromIdeaId: args.fromIdeaId,
      toIdeaId: args.toIdeaId,
      createdAt: Date.now(),
    });
  },
});

export const unlinkIdea = mutation({
  args: {
    fromIdeaId: v.id("ideas"),
    toIdeaId: v.id("ideas"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    const direct = await ctx.db
      .query("ideaLinks")
      .withIndex("by_from_idea", (q) => q.eq("fromIdeaId", args.fromIdeaId))
      .filter((q) => q.eq(q.field("toIdeaId"), args.toIdeaId))
      .first();

    const reverse = await ctx.db
      .query("ideaLinks")
      .withIndex("by_from_idea", (q) => q.eq("fromIdeaId", args.toIdeaId))
      .filter((q) => q.eq(q.field("toIdeaId"), args.fromIdeaId))
      .first();

    for (const link of [direct, reverse]) {
      if (link && link.userId === identity.subject) {
        await ctx.db.delete(link._id);
      }
    }
  },
});

export const createProjectFromIdea = mutation({
  args: {
    ideaId: v.id("ideas"),
    projectName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const idea = await ctx.db.get(args.ideaId);
    if (!idea || idea.userId !== identity.subject) throw new Error("Unauthorized");

    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      userId: identity.subject,
      name: args.projectName,
      slug: args.projectName.toLowerCase().trim().replace(/\s+/g, "-"),
      description: idea.problemOneLiner,
      status: "idea",
      type: "general",
      createdAt: now,
      updatedAt: now,
    });

    const existingLink = await ctx.db
      .query("ideaProjectLinks")
      .withIndex("by_idea", (q) => q.eq("ideaId", args.ideaId))
      .filter((q) => q.eq(q.field("projectId"), projectId))
      .first();

    if (!existingLink) {
      await ctx.db.insert("ideaProjectLinks", {
        userId: identity.subject,
        ideaId: args.ideaId,
        projectId,
        createdAt: now,
      });
    }

    return projectId;
  },
});
