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
    type: v.optional(v.union(v.literal("coding"), v.literal("general"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("projects", {
      ...args,
      type: args.type ?? "general",
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

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    type: v.optional(v.union(v.literal("coding"), v.literal("general"))),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"), v.literal("idea"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const { id, ...updates } = args;

    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        throw new Error("Project name cannot be empty");
      }
      if (trimmedName.length > 120) {
        throw new Error("Project name must be 120 characters or fewer");
      }
      updates.name = trimmedName;
    }

    if (updates.description !== undefined) {
      const trimmedDescription = updates.description.trim();
      if (trimmedDescription.length > 2000) {
        throw new Error("Description must be 2000 characters or fewer");
      }
      updates.description = trimmedDescription;
    }

    if (updates.icon !== undefined) {
      const trimmedIcon = updates.icon.trim();
      if (trimmedIcon.length > 8) {
        throw new Error("Icon must be a single emoji or short string");
      }
      updates.icon = trimmedIcon;
    }

    if (updates.type !== undefined && !["coding", "general"].includes(updates.type)) {
      throw new Error("Invalid project type");
    }

    if (updates.status !== undefined && !["active", "archived", "idea"].includes(updates.status)) {
      throw new Error("Invalid project status");
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(id, filteredUpdates);
    }
  },
});
