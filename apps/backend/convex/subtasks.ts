import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

type SubtaskStatus = "todo" | "done";

async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }
  return identity;
}

async function ensureTaskOwnership(
  ctx: QueryCtx | MutationCtx,
  taskId: Id<"tasks">,
  userId: string
) {
  const task = await ctx.db.get(taskId);
  if (!task || task.userId !== userId) {
    throw new Error("Task not found");
  }
  return task;
}

async function ensureSubtaskOwnership(
  ctx: QueryCtx | MutationCtx,
  subtaskId: Id<"subtasks">,
  userId: string
) {
  const subtask = await ctx.db.get(subtaskId);
  if (!subtask || subtask.userId !== userId) {
    throw new Error("Subtask not found");
  }
  return subtask;
}

// Sync task status when all subtasks are completed
async function syncTaskStatusFromSubtasks(ctx: MutationCtx, taskId: Id<"tasks">) {
  const subtasks = await ctx.db
    .query("subtasks")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
    .collect();

  if (subtasks.length === 0) return;

  const allDone = subtasks.every((s) => s.status === "done");
  const task = await ctx.db.get(taskId);

  if (!task) return;

  // Only auto-complete task if all subtasks are done and task isn't already done
  if (allDone && task.status !== "done") {
    const now = Date.now();
    await ctx.db.patch(taskId, {
      status: "done",
      completedAt: now,
      updatedAt: now,
    });
  }
}

// ============================================================================
// QUERIES
// ============================================================================

export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) return [];

    const subtasks = await ctx.db
      .query("subtasks")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    return subtasks.sort((a, b) => a.order - b.order);
  },
});

export const getSubtaskProgress = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) return null;

    const subtasks = await ctx.db
      .query("subtasks")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const total = subtasks.length;
    const completed = subtasks.filter((s) => s.status === "done").length;
    const percentage = total === 0 ? 0 : completed / total;

    return { total, completed, percentage };
  },
});

// Batch query for getting subtask counts for multiple tasks
export const getSubtaskProgressBatch = query({
  args: { taskIds: v.array(v.id("tasks")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return {};

    const results: Record<
      string,
      { total: number; completed: number; percentage: number }
    > = {};

    await Promise.all(
      args.taskIds.map(async (taskId) => {
        const task = await ctx.db.get(taskId);
        if (!task || task.userId !== identity.subject) return;

        const subtasks = await ctx.db
          .query("subtasks")
          .withIndex("by_task", (q) => q.eq("taskId", taskId))
          .collect();

        const total = subtasks.length;
        const completed = subtasks.filter((s) => s.status === "done").length;
        const percentage = total === 0 ? 0 : completed / total;

        results[taskId] = { total, completed, percentage };
      })
    );

    return results;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureTaskOwnership(ctx, args.taskId, identity.subject);

    const trimmedTitle = args.title.trim();
    if (!trimmedTitle) {
      throw new Error("Title cannot be empty");
    }

    const now = Date.now();

    // Update parent task's updatedAt
    await ctx.db.patch(args.taskId, { updatedAt: now });

    return await ctx.db.insert("subtasks", {
      userId: identity.subject,
      taskId: args.taskId,
      title: trimmedTitle,
      status: "todo",
      order: now,
      createdAt: now,
    });
  },
});

export const update = mutation({
  args: {
    subtaskId: v.id("subtasks"),
    title: v.optional(v.string()),
    status: v.optional(v.union(v.literal("todo"), v.literal("done"))),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const subtask = await ensureSubtaskOwnership(
      ctx,
      args.subtaskId,
      identity.subject
    );

    const patch: Record<string, unknown> = {};

    if (args.title !== undefined) {
      const trimmed = args.title.trim();
      if (!trimmed) throw new Error("Title cannot be empty");
      patch.title = trimmed;
    }

    if (args.status !== undefined) {
      patch.status = args.status;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.subtaskId, patch);

      // Update parent task's updatedAt
      await ctx.db.patch(subtask.taskId, { updatedAt: Date.now() });

      // Check if we need to sync task status
      if (args.status !== undefined) {
        await syncTaskStatusFromSubtasks(ctx, subtask.taskId);
      }
    }

    return args.subtaskId;
  },
});

export const toggle = mutation({
  args: { subtaskId: v.id("subtasks") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const subtask = await ensureSubtaskOwnership(
      ctx,
      args.subtaskId,
      identity.subject
    );

    const newStatus: SubtaskStatus = subtask.status === "done" ? "todo" : "done";

    await ctx.db.patch(args.subtaskId, { status: newStatus });

    // Update parent task's updatedAt
    await ctx.db.patch(subtask.taskId, { updatedAt: Date.now() });

    // Check if we need to sync task status
    await syncTaskStatusFromSubtasks(ctx, subtask.taskId);

    return args.subtaskId;
  },
});

export const remove = mutation({
  args: { subtaskId: v.id("subtasks") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const subtask = await ensureSubtaskOwnership(
      ctx,
      args.subtaskId,
      identity.subject
    );

    await ctx.db.delete(args.subtaskId);

    // Update parent task's updatedAt
    await ctx.db.patch(subtask.taskId, { updatedAt: Date.now() });
  },
});

export const reorder = mutation({
  args: {
    taskId: v.id("tasks"),
    orderedSubtaskIds: v.array(v.id("subtasks")),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureTaskOwnership(ctx, args.taskId, identity.subject);

    const base = Date.now();
    await Promise.all(
      args.orderedSubtaskIds.map((subtaskId, index) =>
        ctx.db.patch(subtaskId, { order: base + index })
      )
    );

    // Update parent task's updatedAt
    await ctx.db.patch(args.taskId, { updatedAt: base });
  },
});

// Bulk create subtasks (useful for creating multiple at once)
export const createBulk = mutation({
  args: {
    taskId: v.id("tasks"),
    titles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureTaskOwnership(ctx, args.taskId, identity.subject);

    const now = Date.now();
    const validTitles = args.titles
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (validTitles.length === 0) {
      throw new Error("At least one valid title is required");
    }

    const ids = await Promise.all(
      validTitles.map((title, index) =>
        ctx.db.insert("subtasks", {
          userId: identity.subject,
          taskId: args.taskId,
          title,
          status: "todo",
          order: now + index,
          createdAt: now,
        })
      )
    );

    // Update parent task's updatedAt
    await ctx.db.patch(args.taskId, { updatedAt: now });

    return ids;
  },
});
