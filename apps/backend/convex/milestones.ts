import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type MilestoneStatus = "planned" | "in_progress" | "completed";

async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }
  return identity;
}

async function ensureProjectOwnership(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  userId: string
) {
  const project = await ctx.db.get(projectId);
  if (!project || project.userId !== userId) {
    throw new Error("Project not found");
  }
  return project;
}

async function ensureMilestoneOwnership(
  ctx: QueryCtx | MutationCtx,
  milestoneId: Id<"milestones">,
  userId: string
) {
  const milestone = await ctx.db.get(milestoneId);
  if (!milestone || milestone.userId !== userId) {
    throw new Error("Milestone not found");
  }
  return milestone;
}

// ============================================================================
// QUERIES
// ============================================================================

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== identity.subject) return [];

    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Calculate progress for each milestone
    const milestonesWithProgress = await Promise.all(
      milestones.map(async (milestone) => {
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_milestone", (q) => q.eq("milestoneId", milestone._id))
          .collect();

        const total = tasks.length;
        const completed = tasks.filter((t) => t.status === "done").length;
        const percentage = total === 0 ? 0 : completed / total;

        return {
          ...milestone,
          progress: { total, completed, percentage },
        };
      })
    );

    return milestonesWithProgress.sort((a, b) => a.order - b.order);
  },
});

export const getById = query({
  args: { milestoneId: v.id("milestones") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone || milestone.userId !== identity.subject) return null;

    // Calculate progress
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_milestone", (q) => q.eq("milestoneId", milestone._id))
      .collect();

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "done").length;
    const percentage = total === 0 ? 0 : completed / total;

    return {
      ...milestone,
      progress: { total, completed, percentage },
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    targetDate: v.optional(v.number()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureProjectOwnership(ctx, args.projectId, identity.subject);

    const now = Date.now();

    return await ctx.db.insert("milestones", {
      userId: identity.subject,
      projectId: args.projectId,
      title: args.title.trim(),
      description: args.description?.trim(),
      targetDate: args.targetDate,
      status: "planned",
      order: now,
      color: args.color,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    milestoneId: v.id("milestones"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    targetDate: v.optional(v.union(v.number(), v.null())),
    status: v.optional(
      v.union(
        v.literal("planned"),
        v.literal("in_progress"),
        v.literal("completed")
      )
    ),
    color: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const milestone = await ensureMilestoneOwnership(
      ctx,
      args.milestoneId,
      identity.subject
    );
    await ensureProjectOwnership(ctx, milestone.projectId, identity.subject);

    const patch: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      const trimmed = args.title.trim();
      if (!trimmed) throw new Error("Title cannot be empty");
      patch.title = trimmed;
    }
    if (args.description !== undefined) {
      patch.description = args.description?.trim() || undefined;
    }
    if (args.targetDate !== undefined) {
      patch.targetDate = args.targetDate ?? undefined;
    }
    if (args.status !== undefined) {
      patch.status = args.status;
    }
    if (args.color !== undefined) {
      patch.color = args.color ?? undefined;
    }

    await ctx.db.patch(args.milestoneId, patch);
    return args.milestoneId;
  },
});

export const remove = mutation({
  args: { milestoneId: v.id("milestones") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const milestone = await ensureMilestoneOwnership(
      ctx,
      args.milestoneId,
      identity.subject
    );
    await ensureProjectOwnership(ctx, milestone.projectId, identity.subject);

    // Unlink all tasks from this milestone
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_milestone", (q) => q.eq("milestoneId", args.milestoneId))
      .collect();

    await Promise.all(
      tasks.map((task) =>
        ctx.db.patch(task._id, { milestoneId: undefined, updatedAt: Date.now() })
      )
    );

    await ctx.db.delete(args.milestoneId);
  },
});

export const reorder = mutation({
  args: {
    projectId: v.id("projects"),
    orderedMilestoneIds: v.array(v.id("milestones")),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureProjectOwnership(ctx, args.projectId, identity.subject);

    const base = Date.now();
    await Promise.all(
      args.orderedMilestoneIds.map((milestoneId, index) =>
        ctx.db.patch(milestoneId, { order: base + index, updatedAt: base })
      )
    );
  },
});

// ============================================================================
// TASK-MILESTONE LINKING
// ============================================================================

export const assignTaskToMilestone = mutation({
  args: {
    taskId: v.id("tasks"),
    milestoneId: v.union(v.id("milestones"), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Task not found");
    }

    if (args.milestoneId) {
      const milestone = await ensureMilestoneOwnership(
        ctx,
        args.milestoneId,
        identity.subject
      );

      // Verify milestone belongs to same project as task
      if (milestone.projectId !== task.projectId) {
        throw new Error("Milestone must belong to the same project as the task");
      }
    }

    await ctx.db.patch(args.taskId, {
      milestoneId: args.milestoneId ?? undefined,
      updatedAt: Date.now(),
    });

    return args.taskId;
  },
});
