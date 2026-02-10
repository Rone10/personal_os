import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

type TodoStatus = "todo" | "in_progress" | "done";

async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return identity;
}

async function ensureTodoOwnership(ctx: QueryCtx | MutationCtx, todoId: Id<"todos">, userId: string) {
  const todo = await ctx.db.get(todoId);
  if (!todo || todo.userId !== userId) throw new Error("Todo not found");
  return todo;
}

async function loadChecklist(ctx: QueryCtx | MutationCtx, todoId: Id<"todos">, userId: string) {
  const items = await ctx.db
    .query("todoChecklist")
    .withIndex("by_user_todo", (q) => q.eq("userId", userId).eq("todoId", todoId))
    .collect();

  return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

async function loadTaskLinks(ctx: QueryCtx | MutationCtx, todoId: Id<"todos">) {
  const links = await ctx.db.query("todoTaskLinks").withIndex("by_todo", (q) => q.eq("todoId", todoId)).collect();
  const tasks: (Doc<"tasks"> | null)[] = await Promise.all(links.map((link) => ctx.db.get(link.taskId)));
  return links.map((link, index) => ({
    link,
    task: tasks[index] || null,
  }));
}

async function hydrateTodoSnapshot(ctx: QueryCtx | MutationCtx, todo: Doc<"todos">, userId: string) {
  const checklist = await loadChecklist(ctx, todo._id, userId);
  const links = await loadTaskLinks(ctx, todo._id);
  return {
    todo,
    checklist,
    links,
    progress: summarizeProgress(links, checklist),
  };
}

function summarizeProgress(
  linkedTasks: { link: Doc<"todoTaskLinks">; task: Doc<"tasks"> | null }[],
  checklist: Doc<"todoChecklist">[],
) {
  const linkedCount = linkedTasks.length;
  const linkedDone = linkedTasks.filter((entry) => entry.task?.status === "done").length;
  const checklistCount = checklist.length;
  const checklistDone = checklist.filter((item) => item.status === "done").length;
  const total = linkedCount + checklistCount;
  const completed = linkedDone + checklistDone;
  const percentage = total === 0 ? 0 : completed / total;

  return {
    total,
    completed,
    linkedCount,
    linkedDone,
    checklistCount,
    checklistDone,
    percentage,
  };
}

export async function syncTodoStatusInternal(ctx: MutationCtx, todoId: Id<"todos">) {
  const todo = await ctx.db.get(todoId);
  if (!todo) return;

  const checklist = await ctx.db
    .query("todoChecklist")
    .withIndex("by_todo", (q) => q.eq("todoId", todoId))
    .collect();
  const links = await ctx.db.query("todoTaskLinks").withIndex("by_todo", (q) => q.eq("todoId", todoId)).collect();
  const tasks: (Doc<"tasks"> | null)[] = await Promise.all(links.map((link) => ctx.db.get(link.taskId)));

  const doneChildren = checklist.every((item) => item.status === "done");
  const doneTasks = tasks.every((task) => task?.status === "done");
  const anyProgress =
    checklist.some((item) => item.status === "done") ||
    tasks.some((task) => task?.status === "in_progress" || task?.status === "done");

  let nextStatus: TodoStatus | null = null;
  if (checklist.length + links.length === 0) {
    nextStatus = todo.status;
  } else if (doneChildren && doneTasks) {
    nextStatus = "done";
  } else if (anyProgress) {
    nextStatus = "in_progress";
  } else {
    nextStatus = "todo";
  }

  if (nextStatus && nextStatus !== todo.status) {
    await ctx.db.patch(todoId, { status: nextStatus });
  }
}

export const getTodayTodos = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayTs = today.getTime();

    const pinned = await ctx.db
      .query("todos")
      .withIndex("by_user_pin", (q) => q.eq("userId", identity.subject).eq("pinForToday", true))
      .filter((q) => q.neq(q.field("status"), "done"))
      .collect();

    const planned = await ctx.db
      .query("todos")
      .withIndex("by_user_planned", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.lte(q.field("plannedDate"), todayTs))
      .collect();

    const merged = new Map<string, Doc<"todos">>();
    [...pinned, ...planned].forEach((todo) => {
      if (todo.status !== "done") {
        merged.set(todo._id, todo);
      }
    });

    const todos = Array.from(merged.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return Promise.all(todos.map((todo) => hydrateTodoSnapshot(ctx, todo, identity.subject)));
  },
});

export const listTodos = query({
  args: {
    status: v.optional(v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const status = args.status;

    let q = ctx.db.query("todos").withIndex("by_user_status", (idx) => idx.eq("userId", identity.subject));
    if (status) {
      q = ctx.db.query("todos").withIndex("by_user_status", (idx) => idx.eq("userId", identity.subject).eq("status", status));
    }

    const todos = await q.collect();
    todos.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return todos;
  },
});

export const getTodoWithLinks = query({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const todo = await ensureTodoOwnership(ctx, args.id, identity.subject);
    const checklist = await loadChecklist(ctx, args.id, identity.subject);
    const links = await loadTaskLinks(ctx, args.id);

    return {
      todo,
      checklist,
      links,
      progress: summarizeProgress(links, checklist),
    };
  },
});

export const getLinkedTodoMeta = query({
  args: { taskIds: v.array(v.id("tasks")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    if (args.taskIds.length === 0) return [];

    const idSet = new Set(args.taskIds.map((id) => id.toString()));
    const links = await ctx.db
      .query("todoTaskLinks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const relevant = links.filter((link) => idSet.has(link.taskId.toString()));
    const todoIds = Array.from(new Set(relevant.map((link) => link.todoId)));
    const todos = await Promise.all(todoIds.map((todoId) => ctx.db.get(todoId)));
    const todoMap = new Map(todoIds.map((todoId, index) => [todoId.toString(), todos[index]]));

    return relevant.map((link) => {
      const todo = todoMap.get(link.todoId.toString());
      return {
        taskId: link.taskId,
        todoId: link.todoId,
        todoTitle: todo?.title ?? "Linked Todo",
        todoStatus: todo?.status ?? "todo",
      };
    });
  },
});

export const createTodo = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    plannedDate: v.optional(v.number()),
    pinForToday: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    return ctx.db.insert("todos", {
      userId: identity.subject,
      title: args.title,
      description: args.description,
      plannedDate: args.plannedDate,
      pinForToday: args.pinForToday ?? false,
      status: "todo",
      order: Date.now(),
    });
  },
});

export const updateTodo = mutation({
  args: {
    id: v.id("todos"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    plannedDate: v.optional(v.union(v.number(), v.null())),
    pinForToday: v.optional(v.boolean()),
    status: v.optional(v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done"))),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureTodoOwnership(ctx, args.id, identity.subject);

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description;
    if (args.plannedDate !== undefined) patch.plannedDate = args.plannedDate;
    if (args.pinForToday !== undefined) patch.pinForToday = args.pinForToday;
    if (args.status !== undefined) patch.status = args.status;
    if (args.order !== undefined) patch.order = args.order;

    await ctx.db.patch(args.id, patch);
    return args.id;
  },
});

export const deleteTodo = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureTodoOwnership(ctx, args.id, identity.subject);

    const checklist = await loadChecklist(ctx, args.id, identity.subject);
    await Promise.all(checklist.map((item) => ctx.db.delete(item._id)));

    const links = await ctx.db.query("todoTaskLinks").withIndex("by_todo", (q) => q.eq("todoId", args.id)).collect();
    await Promise.all(links.map((link) => ctx.db.delete(link._id)));

    await ctx.db.delete(args.id);
  },
});

export const createChecklistItem = mutation({
  args: {
    todoId: v.id("todos"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureTodoOwnership(ctx, args.todoId, identity.subject);

    const id = await ctx.db.insert("todoChecklist", {
      userId: identity.subject,
      todoId: args.todoId,
      title: args.title,
      status: "todo",
      order: Date.now(),
    });

    await syncTodoStatusInternal(ctx, args.todoId);
    return id;
  },
});

export const updateChecklistItem = mutation({
  args: {
    id: v.id("todoChecklist"),
    title: v.optional(v.string()),
    status: v.optional(v.union(v.literal("todo"), v.literal("done"))),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const item = await ctx.db.get(args.id);
    if (!item || item.userId !== identity.subject) throw new Error("Item not found");

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.status !== undefined) patch.status = args.status;
    await ctx.db.patch(args.id, patch);

    await syncTodoStatusInternal(ctx, item.todoId);
  },
});

export const deleteChecklistItem = mutation({
  args: { id: v.id("todoChecklist") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const item = await ctx.db.get(args.id);
    if (!item || item.userId !== identity.subject) throw new Error("Item not found");

    await ctx.db.delete(args.id);
    await syncTodoStatusInternal(ctx, item.todoId);
  },
});

export const linkTaskToTodo = mutation({
  args: {
    todoId: v.id("todos"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureTodoOwnership(ctx, args.todoId, identity.subject);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) throw new Error("Task not found");

    const existing = await ctx.db.query("todoTaskLinks").withIndex("by_task", (q) => q.eq("taskId", args.taskId)).unique();
    if (existing) {
      if (existing.todoId === args.todoId) {
        return existing._id;
      }
      throw new Error("TASK_ALREADY_LINKED");
    }

    const linkId = await ctx.db.insert("todoTaskLinks", {
      userId: identity.subject,
      todoId: args.todoId,
      taskId: args.taskId,
      taskStatus: task.status,
      linkedAt: Date.now(),
      updatedAt: Date.now(),
    });

    await syncTodoStatusInternal(ctx, args.todoId);
    return linkId;
  },
});

export const unlinkTaskFromTodo = mutation({
  args: {
    todoId: v.id("todos"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureTodoOwnership(ctx, args.todoId, identity.subject);

    const link = await ctx.db.query("todoTaskLinks").withIndex("by_task", (q) => q.eq("taskId", args.taskId)).unique();
    if (!link || link.todoId !== args.todoId) return;

    await ctx.db.delete(link._id);
    await syncTodoStatusInternal(ctx, args.todoId);
  },
});

export const relinkTask = mutation({
  args: {
    sourceTodoId: v.optional(v.id("todos")),
    targetTodoId: v.id("todos"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureTodoOwnership(ctx, args.targetTodoId, identity.subject);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) throw new Error("Task not found");

    const existing = await ctx.db.query("todoTaskLinks").withIndex("by_task", (q) => q.eq("taskId", args.taskId)).unique();
    if (existing) {
      if (args.sourceTodoId && existing.todoId !== args.sourceTodoId) {
        throw new Error("Source mismatch");
      }
      await ctx.db.patch(existing._id, {
        todoId: args.targetTodoId,
        updatedAt: Date.now(),
      });
      if (args.sourceTodoId) {
        await syncTodoStatusInternal(ctx, args.sourceTodoId);
      }
      await syncTodoStatusInternal(ctx, args.targetTodoId);
      return existing._id;
    }

    const linkId = await ctx.db.insert("todoTaskLinks", {
      userId: identity.subject,
      todoId: args.targetTodoId,
      taskId: args.taskId,
      taskStatus: task.status,
      linkedAt: Date.now(),
      updatedAt: Date.now(),
    });

    await syncTodoStatusInternal(ctx, args.targetTodoId);
    return linkId;
  },
});

export const setTodoStatus = mutation({
  args: {
    id: v.id("todos"),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    cascadeChildren: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureTodoOwnership(ctx, args.id, identity.subject);

    if (args.status === "done") {
      const links = await ctx.db.query("todoTaskLinks").withIndex("by_todo", (q) => q.eq("todoId", args.id)).collect();
      const tasks: (Doc<"tasks"> | null)[] = await Promise.all(links.map((link) => ctx.db.get(link.taskId)));
      const checklist = await loadChecklist(ctx, args.id, identity.subject);
      const hasIncompleteChildren =
        checklist.some((item) => item.status !== "done") || tasks.some((task) => task?.status !== "done");

      if (hasIncompleteChildren && !args.cascadeChildren) {
        throw new Error("CONFIRM_CASCADE");
      }

      if (args.cascadeChildren) {
        await Promise.all(
          checklist
            .filter((item) => item.status !== "done")
            .map((item) => ctx.db.patch(item._id, { status: "done" })),
        );
        await Promise.all(
          links
            .map((link, index) => ({ link, task: tasks[index] }))
            .filter(({ task }) => task && task.status !== "done")
            .map(({ task }) => ctx.db.patch(task!._id, { status: "done" })),
        );
      }
    }

    await ctx.db.patch(args.id, { status: args.status });
    await syncTodoStatusInternal(ctx, args.id);
  },
});

export const reorderTodos = mutation({
  args: {
    orderedIds: v.array(v.id("todos")),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await Promise.all(
      args.orderedIds.map((id, index) => {
        return ensureTodoOwnership(ctx, id, identity.subject).then(() =>
          ctx.db.patch(id, { order: Date.now() + index }),
        );
      }),
    );
  },
});
