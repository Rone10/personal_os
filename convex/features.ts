import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

type ChecklistStatus = "todo" | "done";

type FeatureWithChecklist = Doc<"projectFeatures"> & {
  checklist: Doc<"featureChecklistItems">[];
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };
};

async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }
  return identity;
}

async function ensureProjectOwnership(ctx: QueryCtx | MutationCtx, projectId: Id<"projects">, userId: string) {
  const project = await ctx.db.get(projectId);
  if (!project || project.userId !== userId) {
    throw new Error("Project not found");
  }
  return project;
}

async function ensureFeatureOwnership(
  ctx: QueryCtx | MutationCtx,
  featureId: Id<"projectFeatures">,
  userId: string,
) {
  const feature = await ctx.db.get(featureId);
  if (!feature || feature.userId !== userId) {
    throw new Error("Feature not found");
  }
  return feature;
}

async function ensureChecklistOwnership(
  ctx: QueryCtx | MutationCtx,
  checklistId: Id<"featureChecklistItems">,
  userId: string,
) {
  const item = await ctx.db.get(checklistId);
  if (!item || item.userId !== userId) {
    throw new Error("Checklist item not found");
  }
  return item;
}

function buildProgressPayload(itemCount: number, doneCount: number) {
  const total = itemCount;
  const completed = doneCount;
  const percentage = total === 0 ? 0 : completed / total;
  return { total, completed, percentage };
}

async function collectChecklistForFeature(ctx: QueryCtx, featureId: Id<"projectFeatures">) {
  const checklist = await ctx.db
    .query("featureChecklistItems")
    .withIndex("by_feature", (q) => q.eq("featureId", featureId))
    .collect();

  return checklist.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

async function recomputeChecklistStatus(ctx: MutationCtx, item: Doc<"featureChecklistItems">) {
  const linkedTaskIds = item.linkedTaskIds ?? [];
  if (linkedTaskIds.length === 0) {
    return;
  }

  const tasks = await Promise.all(linkedTaskIds.map((taskId) => ctx.db.get(taskId)));
  const allDone = linkedTaskIds.length > 0 && tasks.every((task) => task?.status === "done");
  const nextStatus: ChecklistStatus = allDone ? "done" : "todo";

  if (item.status !== nextStatus) {
    await ctx.db.patch(item._id, { status: nextStatus });
  }
}

async function addTaskToChecklist(ctx: MutationCtx, itemId: Id<"featureChecklistItems">, taskId: Id<"tasks">) {
  const item = await ctx.db.get(itemId);
  if (!item) return;
  const current = new Set(item.linkedTaskIds ?? []);
  if (!current.has(taskId)) {
    current.add(taskId);
    await ctx.db.patch(item._id, { linkedTaskIds: Array.from(current) });
  }
  await recomputeChecklistStatus(ctx, { ...item, linkedTaskIds: Array.from(current) });
}

async function removeTaskFromChecklist(ctx: MutationCtx, itemId: Id<"featureChecklistItems">, taskId: Id<"tasks">) {
  const item = await ctx.db.get(itemId);
  if (!item) return;
  const current = new Set(item.linkedTaskIds ?? []);
  if (current.delete(taskId)) {
    await ctx.db.patch(item._id, { linkedTaskIds: Array.from(current) });
  }
  await recomputeChecklistStatus(ctx, { ...item, linkedTaskIds: Array.from(current) });
}

async function detachTaskFeatureRefs(ctx: MutationCtx, task: Doc<"tasks">) {
  if (task.featureChecklistItemId) {
    await removeTaskFromChecklist(ctx, task.featureChecklistItemId, task._id);
  }

  if (task.featureId || task.featureChecklistItemId) {
    await ctx.db.patch(task._id, { featureId: undefined, featureChecklistItemId: undefined });
  }
}

export async function detachTaskFromFeature(ctx: MutationCtx, taskId: Id<"tasks">) {
  const task = await ctx.db.get(taskId);
  if (!task) return;
  await detachTaskFeatureRefs(ctx, task);
}

export async function syncChecklistStatusFromTask(
  ctx: MutationCtx,
  taskId: Id<"tasks">,
): Promise<void> {
  const task = await ctx.db.get(taskId);
  if (!task || !task.featureChecklistItemId) return;
  const item = await ctx.db.get(task.featureChecklistItemId);
  if (!item) return;
  await recomputeChecklistStatus(ctx, item);
}

function summarizeFeature(checklist: Doc<"featureChecklistItems">[]): FeatureWithChecklist["progress"] {
  const total = checklist.length;
  const completed = checklist.filter((item) => item.status === "done").length;
  return buildProgressPayload(total, completed);
}

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureProjectOwnership(ctx, args.projectId, identity.subject);

    const features = await ctx.db
      .query("projectFeatures")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const sorted = features.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const hydrated: FeatureWithChecklist[] = [];

    for (const feature of sorted) {
      const checklist = await collectChecklistForFeature(ctx, feature._id);
      hydrated.push({
        ...feature,
        checklist,
        progress: summarizeFeature(checklist),
      });
    }

    return hydrated;
  },
});

export const getFeature = query({
  args: { featureId: v.id("projectFeatures") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const feature = await ensureFeatureOwnership(ctx, args.featureId, identity.subject);
    await ensureProjectOwnership(ctx, feature.projectId, identity.subject);

    const checklist = await collectChecklistForFeature(ctx, feature._id);
    return {
      ...feature,
      checklist,
      progress: summarizeFeature(checklist),
    } satisfies FeatureWithChecklist;
  },
});

export const createFeature = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    whatDoneLooksLike: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureProjectOwnership(ctx, args.projectId, identity.subject);

    return ctx.db.insert("projectFeatures", {
      userId: identity.subject,
      projectId: args.projectId,
      title: args.title,
      description: args.description,
      whatDoneLooksLike: args.whatDoneLooksLike,
      order: Date.now(),
    });
  },
});

export const updateFeature = mutation({
  args: {
    featureId: v.id("projectFeatures"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    whatDoneLooksLike: v.optional(v.union(v.string(), v.null())),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const feature = await ensureFeatureOwnership(ctx, args.featureId, identity.subject);
    await ensureProjectOwnership(ctx, feature.projectId, identity.subject);

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description ?? undefined;
    if (args.whatDoneLooksLike !== undefined) patch.whatDoneLooksLike = args.whatDoneLooksLike ?? undefined;
    if (args.order !== undefined) patch.order = args.order;

    if (Object.keys(patch).length === 0) {
      return feature._id;
    }

    await ctx.db.patch(feature._id, patch);
    return feature._id;
  },
});

export const deleteFeature = mutation({
  args: { featureId: v.id("projectFeatures") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const feature = await ensureFeatureOwnership(ctx, args.featureId, identity.subject);
    await ensureProjectOwnership(ctx, feature.projectId, identity.subject);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_feature", (q) => q.eq("featureId", feature._id))
      .collect();

    await Promise.all(tasks.map((task) => detachTaskFeatureRefs(ctx, task)));

    const checklist = await ctx.db
      .query("featureChecklistItems")
      .withIndex("by_feature", (q) => q.eq("featureId", feature._id))
      .collect();

    await Promise.all(checklist.map((item) => ctx.db.delete(item._id)));

    await ctx.db.delete(feature._id);
  },
});

export const createChecklistItem = mutation({
  args: {
    featureId: v.id("projectFeatures"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const feature = await ensureFeatureOwnership(ctx, args.featureId, identity.subject);
    await ensureProjectOwnership(ctx, feature.projectId, identity.subject);

    return ctx.db.insert("featureChecklistItems", {
      userId: identity.subject,
      projectId: feature.projectId,
      featureId: feature._id,
      title: args.title,
      description: args.description,
      status: "todo",
      order: Date.now(),
      linkedTaskIds: [],
    });
  },
});

export const updateChecklistItem = mutation({
  args: {
    checklistId: v.id("featureChecklistItems"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    status: v.optional(v.union(v.literal("todo"), v.literal("done"))),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const item = await ensureChecklistOwnership(ctx, args.checklistId, identity.subject);
    await ensureProjectOwnership(ctx, item.projectId, identity.subject);

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description ?? undefined;
    if (args.order !== undefined) patch.order = args.order;
    if (args.status !== undefined) {
      const linked = item.linkedTaskIds ?? [];
      if (linked.length > 0) {
        throw new Error("Checklist status is controlled by linked tasks");
      }
      patch.status = args.status;
    }

    if (Object.keys(patch).length === 0) {
      return item._id;
    }

    await ctx.db.patch(item._id, patch);
    return item._id;
  },
});

export const deleteChecklistItem = mutation({
  args: { checklistId: v.id("featureChecklistItems") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const item = await ensureChecklistOwnership(ctx, args.checklistId, identity.subject);
    await ensureProjectOwnership(ctx, item.projectId, identity.subject);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_checklist_item", (q) => q.eq("featureChecklistItemId", item._id))
      .collect();

    await Promise.all(
      tasks.map(async (task) => {
        await removeTaskFromChecklist(ctx, item._id, task._id);
        await ctx.db.patch(task._id, { featureChecklistItemId: undefined });
      }),
    );
    await ctx.db.delete(item._id);
  },
});

export const linkTaskToFeature = mutation({
  args: {
    taskId: v.id("tasks"),
    featureId: v.id("projectFeatures"),
    checklistId: v.optional(v.id("featureChecklistItems")),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Task not found");
    }

    const feature = await ensureFeatureOwnership(ctx, args.featureId, identity.subject);
    await ensureProjectOwnership(ctx, feature.projectId, identity.subject);

    if (task.projectId !== feature.projectId) {
      throw new Error("Task and feature must belong to the same project");
    }

    if (task.featureId && task.featureId !== feature._id) {
      await detachTaskFeatureRefs(ctx, task);
    }

    let checklistId: Id<"featureChecklistItems"> | undefined = undefined;
    if (args.checklistId) {
      const checklist = await ensureChecklistOwnership(ctx, args.checklistId, identity.subject);
      if (checklist.featureId !== feature._id) {
        throw new Error("Checklist item does not belong to feature");
      }
      checklistId = checklist._id;
    }

    if (task.featureChecklistItemId && task.featureChecklistItemId !== checklistId) {
      await removeTaskFromChecklist(ctx, task.featureChecklistItemId, task._id);
    }

    await ctx.db.patch(task._id, {
      featureId: feature._id,
      featureChecklistItemId: checklistId,
    });

    if (checklistId) {
      await addTaskToChecklist(ctx, checklistId, task._id);
    }

    await syncChecklistStatusFromTask(ctx, task._id);

    return task._id;
  },
});

export const unlinkTaskFromFeature = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Task not found");
    }

    await detachTaskFeatureRefs(ctx, task);
  },
});

export const reorderFeatures = mutation({
  args: {
    projectId: v.id("projects"),
    orderedFeatureIds: v.array(v.id("projectFeatures")),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureProjectOwnership(ctx, args.projectId, identity.subject);

    const base = Date.now();
    await Promise.all(
      args.orderedFeatureIds.map((featureId, index) =>
        ctx.db.patch(featureId, { order: base + index }),
      ),
    );
  },
});

export const reorderChecklist = mutation({
  args: {
    featureId: v.id("projectFeatures"),
    orderedChecklistIds: v.array(v.id("featureChecklistItems")),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const feature = await ensureFeatureOwnership(ctx, args.featureId, identity.subject);
    await ensureProjectOwnership(ctx, feature.projectId, identity.subject);

    const base = Date.now();
    await Promise.all(
      args.orderedChecklistIds.map((checklistId, index) =>
        ctx.db.patch(checklistId, { order: base + index }),
      ),
    );
  },
});

export const getLinkedTasksForChecklistItem = query({
  args: { checklistId: v.id("featureChecklistItems") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const item = await ensureChecklistOwnership(ctx, args.checklistId, identity.subject);

    const linkedTaskIds = item.linkedTaskIds ?? [];
    if (linkedTaskIds.length === 0) {
      return [];
    }

    const tasks = await Promise.all(
      linkedTaskIds.map((taskId) => ctx.db.get(taskId))
    );

    return tasks
      .filter((task): task is Doc<"tasks"> => task !== null && task.userId === identity.subject)
      .map((task) => ({
        _id: task._id,
        title: task.title,
        status: task.status,
        priorityLevel: task.priorityLevel ?? "low",
      }));
  },
});

export const getLinkedTasksForChecklistItemsBatch = query({
  args: { checklistIds: v.array(v.id("featureChecklistItems")) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    if (!identity) return {};

    const result: Record<string, Array<{
      _id: Id<"tasks">;
      title: string;
      status: "todo" | "in_progress" | "done";
      priorityLevel: string;
    }>> = {};

    for (const checklistId of args.checklistIds) {
      const item = await ctx.db.get(checklistId);
      if (!item || item.userId !== identity.subject) {
        result[checklistId] = [];
        continue;
      }

      const linkedTaskIds = item.linkedTaskIds ?? [];
      if (linkedTaskIds.length === 0) {
        result[checklistId] = [];
        continue;
      }

      const tasks = await Promise.all(
        linkedTaskIds.map((taskId) => ctx.db.get(taskId))
      );

      result[checklistId] = tasks
        .filter((task): task is Doc<"tasks"> => task !== null && task.userId === identity.subject)
        .map((task) => ({
          _id: task._id,
          title: task.title,
          status: task.status,
          priorityLevel: task.priorityLevel ?? "low",
        }));
    }

    return result;
  },
});
