import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

    return await ctx.db
      .query("tasks")
      .withIndex("by_user_project", (q) =>
        q.eq("userId", identity.subject).eq("projectId", args.projectId)
      )
      .collect();
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

    return tasks.filter((t) => {
      // Include if in_progress OR (has due date AND due date <= today)
      return t.status === "in_progress" || (t.dueDate && t.dueDate <= todayTs);
    });
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    projectId: v.id("projects"),
    priority: v.number(),
    dueDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== identity.subject) {
      throw new Error("Unauthorized or Project not found");
    }

    return await ctx.db.insert("tasks", {
      ...args,
      userId: identity.subject,
      status: "todo",
    });
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

    const newStatus = task.status === "done" ? "todo" : "done";
    await ctx.db.patch(args.id, { status: newStatus });
  },
});
