import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { syncTodoStatusInternal } from "./todos";
import { syncChecklistStatusFromTask, detachTaskFromFeature } from "./features";

type TaskStatus = "todo" | "in_progress" | "done";
type TaskPriorityLevel = "low" | "medium" | "high" | "urgent" | "critical";

const PRIORITY_LEVEL_TO_NUMERIC: Record<TaskPriorityLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
  critical: 5,
};

function resolvePriorityLevel(priorityLevel: TaskPriorityLevel | undefined, legacyPriority: number | undefined): TaskPriorityLevel {
  if (priorityLevel) return priorityLevel;
  switch (legacyPriority) {
    case 2:
      return "medium";
    case 3:
      return "high";
    case 4:
      return "urgent";
    case 5:
      return "critical";
    default:
      return "low";
  }
}

function applyPriorityLevelPatch(priorityLevel?: TaskPriorityLevel) {
  if (!priorityLevel) {
    return {};
  }
  return {
    priorityLevel,
    priority: PRIORITY_LEVEL_TO_NUMERIC[priorityLevel],
  };
}

function ensureTaskHasPriority(task: Doc<"tasks">): Doc<"tasks"> {
  if (task.priorityLevel) {
    return task;
  }
  const fallbackLevel = resolvePriorityLevel(undefined, task.priority);
  return { ...task, priorityLevel: fallbackLevel } as Doc<"tasks">;
}

async function updateLinkedTodoForTask(ctx: MutationCtx, taskId: Id<"tasks">, status: TaskStatus) {
  const link = await ctx.db.query("todoTaskLinks").withIndex("by_task", (q) => q.eq("taskId", taskId)).unique();
  if (!link) return;
  await ctx.db.patch(link._id, { taskStatus: status, updatedAt: Date.now() });
  await syncTodoStatusInternal(ctx, link.todoId);
}

async function syncLinkedFeature(ctx: MutationCtx, taskId: Id<"tasks">) {
  await syncChecklistStatusFromTask(ctx, taskId);
}

export const getByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== identity.subject) return [];

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_project", (q) =>
        q.eq("userId", identity.subject).eq("projectId", args.projectId)
      )
      .collect();

    return tasks.map(ensureTaskHasPriority);
  },
});

export const getToday = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Fetch all active tasks for the user
    // Note: For a personal OS, fetching all tasks and filtering in memory is acceptable
    // as the dataset is small. For scale, we'd need a more specific index.
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_project", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.neq(q.field("status"), "done"))
      .collect();

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayTs = today.getTime();

    return tasks
      .filter((t) => {
      // Include if in_progress OR (has due date AND due date <= today)
      return t.status === "in_progress" || (t.dueDate && t.dueDate <= todayTs);
      })
      .map(ensureTaskHasPriority);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    projectId: v.id("projects"),
    priorityLevel: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"), v.literal("critical")),
    ),
    dueDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    assignees: v.optional(v.array(v.string())),
    attachments: v.optional(v.array(v.string())),
    milestoneId: v.optional(v.id("milestones")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== identity.subject) {
      throw new Error("Unauthorized or Project not found");
    }

    // Verify milestone ownership and project match if provided
    if (args.milestoneId) {
      const milestone = await ctx.db.get(args.milestoneId);
      if (!milestone || milestone.userId !== identity.subject) {
        throw new Error("Milestone not found");
      }
      if (milestone.projectId !== args.projectId) {
        throw new Error("Milestone must belong to the same project");
      }
    }

    const priorityLevel = args.priorityLevel ?? "low";
    const numericPriority = PRIORITY_LEVEL_TO_NUMERIC[priorityLevel];
    const now = Date.now();

    return await ctx.db.insert("tasks", {
      title: args.title,
      projectId: args.projectId,
      dueDate: args.dueDate,
      tags: args.tags,
      description: args.description,
      assignees: args.assignees,
      attachments: args.attachments,
      priorityLevel,
      priority: numericPriority,
      userId: identity.subject,
      status: "todo",
      order: now,
      milestoneId: args.milestoneId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const move = mutation({
  args: {
    id: v.id("tasks"),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    const patch: Record<string, unknown> = {
      status: args.status,
      order: args.newOrder,
      updatedAt: now,
    };

    // Track when task is completed
    if (args.status === "done" && task.status !== "done") {
      patch.completedAt = now;
    } else if (args.status !== "done" && task.status === "done") {
      // Clear completedAt if moving out of done
      patch.completedAt = undefined;
    }

    await ctx.db.patch(args.id, patch);

    await updateLinkedTodoForTask(ctx, args.id, args.status);
    await syncLinkedFeature(ctx, args.id);
  },
});

export const toggle = mutation({
  args: {
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const newStatus = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    const now = Date.now();
    const patch: Record<string, unknown> = {
      status: newStatus,
      updatedAt: now,
    };

    // Track when task is completed
    if (newStatus === "done" && task.status !== "done") {
      patch.completedAt = now;
    } else if (newStatus !== "done" && task.status === "done") {
      patch.completedAt = undefined;
    }

    await ctx.db.patch(args.id, patch);
    await updateLinkedTodoForTask(ctx, args.id, newStatus);
    await syncLinkedFeature(ctx, args.id);
  },
});

export const updateTask = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    priorityLevel: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"), v.literal("critical")),
    ),
    dueDate: v.optional(v.union(v.number(), v.null())),
    assignees: v.optional(v.array(v.string())),
    attachments: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done"))),
    milestoneId: v.optional(v.union(v.id("milestones"), v.null())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Verify milestone ownership and project match if provided
    if (args.milestoneId !== undefined && args.milestoneId !== null) {
      const milestone = await ctx.db.get(args.milestoneId);
      if (!milestone || milestone.userId !== identity.subject) {
        throw new Error("Milestone not found");
      }
      if (milestone.projectId !== task.projectId) {
        throw new Error("Milestone must belong to the same project");
      }
    }

    const now = Date.now();
    const patch: Record<string, unknown> = {
      updatedAt: now,
    };
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description ?? undefined;
    if (args.assignees !== undefined) patch.assignees = args.assignees;
    if (args.attachments !== undefined) patch.attachments = args.attachments;
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.dueDate !== undefined) patch.dueDate = args.dueDate ?? undefined;
    if (args.priorityLevel !== undefined) {
      Object.assign(patch, applyPriorityLevelPatch(args.priorityLevel));
    }
    if (args.milestoneId !== undefined) {
      patch.milestoneId = args.milestoneId ?? undefined;
    }
    if (args.status !== undefined) {
      patch.status = args.status;
      // Track when task is completed
      if (args.status === "done" && task.status !== "done") {
        patch.completedAt = now;
      } else if (args.status !== "done" && task.status === "done") {
        patch.completedAt = undefined;
      }
    }

    await ctx.db.patch(args.id, patch);

    if (args.status !== undefined) {
      await updateLinkedTodoForTask(ctx, args.id, args.status);
      await syncLinkedFeature(ctx, args.id);
    }

    return args.id;
  },
});

export const deleteTask = mutation({
  args: {
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const links = await ctx.db.query("todoTaskLinks").withIndex("by_task", (q) => q.eq("taskId", args.id)).collect();
    await detachTaskFromFeature(ctx, args.id);
    await ctx.db.delete(args.id);

    if (links.length) {
      await Promise.all(links.map((link) => ctx.db.delete(link._id)));
      await Promise.all(links.map((link) => syncTodoStatusInternal(ctx, link.todoId)));
    }

    return null;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    const patch: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };

    // Track when task is completed
    if (args.status === "done" && task.status !== "done") {
      patch.completedAt = now;
    } else if (args.status !== "done" && task.status === "done") {
      patch.completedAt = undefined;
    }

    await ctx.db.patch(args.id, patch);
    await updateLinkedTodoForTask(ctx, args.id, args.status);
    await syncLinkedFeature(ctx, args.id);
  },
});

export const listForLinking = query({
  args: {
    projectId: v.optional(v.id("projects")),
    status: v.optional(v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done"))),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    let q = ctx.db.query("tasks").withIndex("by_user_project", (qb) => qb.eq("userId", identity.subject));
    if (args.projectId) {
      q = q.filter((f) => f.eq(f.field("projectId"), args.projectId!));
    }
    if (args.status) {
      q = q.filter((f) => f.eq(f.field("status"), args.status!));
    }

    const results = await q.collect();
    const filtered = args.search
      ? results.filter((task) => task.title.toLowerCase().includes(args.search!.toLowerCase()))
      : results;

    return filtered
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(ensureTaskHasPriority);
  },
});
