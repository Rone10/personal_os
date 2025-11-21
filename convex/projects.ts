import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("archived"), v.literal("idea"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const status = args.status ?? "active";
    
    return await ctx.db
      .query("projects")
      .withIndex("by_user_status", (q) => 
        q.eq("userId", identity.subject).eq("status", status)
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("projects", {
      ...args,
      userId: identity.subject,
      status: "active",
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("projects"),
    status: v.union(v.literal("active"), v.literal("archived"), v.literal("idea")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, { status: args.status });
  },
});
