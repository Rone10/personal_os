import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Check if adding an edge from blockedTaskId -> blockingTaskId would create a cycle.
 * Uses BFS to see if blockingTaskId can reach blockedTaskId through existing dependencies.
 */
async function wouldCreateCycle(
  ctx: QueryCtx,
  blockedTaskId: Id<"tasks">,
  blockingTaskId: Id<"tasks">
): Promise<boolean> {
  // If we add "blockingTaskId blocks blockedTaskId",
  // we need to check if blockedTaskId can reach blockingTaskId through existing deps
  // (that would create a cycle)
  const visited = new Set<string>();
  const queue: Id<"tasks">[] = [blockingTaskId];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === blockedTaskId) {
      return true; // Cycle detected!
    }

    const currentStr = current.toString();
    if (visited.has(currentStr)) continue;
    visited.add(currentStr);

    // Get all tasks that block the current task (current's blockers)
    const deps = await ctx.db
      .query("taskDependencies")
      .withIndex("by_blocked", (q) => q.eq("blockedTaskId", current))
      .collect();

    for (const dep of deps) {
      queue.push(dep.blockingTaskId);
    }
  }

  return false;
}

/**
 * Get all tasks that are blocking a specific task (blockers OF this task)
 */
export const getBlockersForTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const deps = await ctx.db
      .query("taskDependencies")
      .withIndex("by_blocked", (q) => q.eq("blockedTaskId", args.taskId))
      .collect();

    // Fetch the blocking tasks
    const blockerTasks = await Promise.all(
      deps.map(async (dep) => {
        const task = await ctx.db.get(dep.blockingTaskId);
        if (!task || task.userId !== identity.subject) return null;
        return {
          dependencyId: dep._id,
          task,
        };
      })
    );

    return blockerTasks.filter(Boolean);
  },
});

/**
 * Get all tasks that are blocked by a specific task (tasks this one blocks)
 */
export const getBlockedByTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const deps = await ctx.db
      .query("taskDependencies")
      .withIndex("by_blocking", (q) => q.eq("blockingTaskId", args.taskId))
      .collect();

    // Fetch the blocked tasks
    const blockedTasks = await Promise.all(
      deps.map(async (dep) => {
        const task = await ctx.db.get(dep.blockedTaskId);
        if (!task || task.userId !== identity.subject) return null;
        return {
          dependencyId: dep._id,
          task,
        };
      })
    );

    return blockedTasks.filter(Boolean);
  },
});

/**
 * Batch query for dependencies - used for Kanban board display
 * Returns a map of taskId -> { blockers: [...], blocking: [...] }
 */
export const getDependenciesForTasksBatch = query({
  args: {
    taskIds: v.array(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return {};

    if (args.taskIds.length === 0) return {};

    // Fetch all dependencies where any of the taskIds is either blocking or blocked
    const allDeps = await ctx.db
      .query("taskDependencies")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const taskIdSet = new Set(args.taskIds.map((id) => id.toString()));

    // Filter to only include relevant dependencies
    const relevantDeps = allDeps.filter(
      (dep) =>
        taskIdSet.has(dep.blockedTaskId.toString()) ||
        taskIdSet.has(dep.blockingTaskId.toString())
    );

    // Build the result map
    const result: Record<
      string,
      {
        blockerIds: Id<"tasks">[];
        blockingIds: Id<"tasks">[];
      }
    > = {};

    // Initialize all requested tasks
    for (const taskId of args.taskIds) {
      result[taskId.toString()] = {
        blockerIds: [],
        blockingIds: [],
      };
    }

    for (const dep of relevantDeps) {
      const blockedStr = dep.blockedTaskId.toString();
      const blockingStr = dep.blockingTaskId.toString();

      // If this task is blocked, record its blocker
      if (result[blockedStr]) {
        result[blockedStr].blockerIds.push(dep.blockingTaskId);
      }

      // If this task is blocking something, record what it blocks
      if (result[blockingStr]) {
        result[blockingStr].blockingIds.push(dep.blockedTaskId);
      }
    }

    return result;
  },
});

/**
 * Create a new dependency between two tasks
 */
export const create = mutation({
  args: {
    blockedTaskId: v.id("tasks"),
    blockingTaskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Prevent self-reference
    if (args.blockedTaskId === args.blockingTaskId) {
      throw new Error("A task cannot block itself");
    }

    // Verify both tasks exist and belong to the user
    const [blockedTask, blockingTask] = await Promise.all([
      ctx.db.get(args.blockedTaskId),
      ctx.db.get(args.blockingTaskId),
    ]);

    if (!blockedTask || blockedTask.userId !== identity.subject) {
      throw new Error("Blocked task not found");
    }

    if (!blockingTask || blockingTask.userId !== identity.subject) {
      throw new Error("Blocking task not found");
    }

    // Verify both tasks belong to the same project
    if (blockedTask.projectId !== blockingTask.projectId) {
      throw new Error("Tasks must belong to the same project");
    }

    // Check for duplicate dependency
    const existingDep = await ctx.db
      .query("taskDependencies")
      .withIndex("by_blocked", (q) => q.eq("blockedTaskId", args.blockedTaskId))
      .filter((q) => q.eq(q.field("blockingTaskId"), args.blockingTaskId))
      .first();

    if (existingDep) {
      throw new Error("This dependency already exists");
    }

    // Check for cycle
    const wouldCycle = await wouldCreateCycle(
      ctx,
      args.blockedTaskId,
      args.blockingTaskId
    );

    if (wouldCycle) {
      throw new Error("This dependency would create a circular reference");
    }

    // Create the dependency
    return await ctx.db.insert("taskDependencies", {
      userId: identity.subject,
      blockedTaskId: args.blockedTaskId,
      blockingTaskId: args.blockingTaskId,
      dependencyType: "finish_to_start",
      createdAt: Date.now(),
    });
  },
});

/**
 * Remove a dependency between two tasks
 */
export const remove = mutation({
  args: {
    blockedTaskId: v.id("tasks"),
    blockingTaskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Find the dependency
    const dep = await ctx.db
      .query("taskDependencies")
      .withIndex("by_blocked", (q) => q.eq("blockedTaskId", args.blockedTaskId))
      .filter((q) => q.eq(q.field("blockingTaskId"), args.blockingTaskId))
      .first();

    if (!dep) {
      throw new Error("Dependency not found");
    }

    // Verify ownership
    if (dep.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(dep._id);
    return null;
  },
});

/**
 * Remove a dependency by its ID
 */
export const removeById = mutation({
  args: {
    dependencyId: v.id("taskDependencies"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const dep = await ctx.db.get(args.dependencyId);
    if (!dep) {
      throw new Error("Dependency not found");
    }

    if (dep.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.dependencyId);
    return null;
  },
});

/**
 * Get tasks available for linking as blockers (for the picker dialog)
 * Excludes: self, tasks already blocking this one, tasks that would create cycles
 */
export const getAvailableBlockers = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get the task to find its project
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) return [];

    // Get all tasks in the same project (excluding self)
    const projectTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_project", (q) =>
        q.eq("userId", identity.subject).eq("projectId", task.projectId)
      )
      .collect();

    // Get existing blockers for this task
    const existingDeps = await ctx.db
      .query("taskDependencies")
      .withIndex("by_blocked", (q) => q.eq("blockedTaskId", args.taskId))
      .collect();

    const existingBlockerIds = new Set(
      existingDeps.map((d) => d.blockingTaskId.toString())
    );

    // Filter out self and existing blockers
    const candidates = projectTasks.filter(
      (t) =>
        t._id !== args.taskId && !existingBlockerIds.has(t._id.toString())
    );

    // Check each candidate for potential cycles
    const availableTasks = await Promise.all(
      candidates.map(async (candidate) => {
        const wouldCycle = await wouldCreateCycle(
          ctx,
          args.taskId,
          candidate._id
        );
        return wouldCycle ? null : candidate;
      })
    );

    return availableTasks.filter(Boolean);
  },
});
