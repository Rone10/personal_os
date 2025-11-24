import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // --- PROJECTS & TASKS ---
  projects: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived"), v.literal("idea")),
    icon: v.optional(v.string()), // Emoji or icon name
    slug: v.string(),
  }).index("by_user_status", ["userId", "status"]),

  tasks: defineTable({
    userId: v.string(),
    title: v.string(),
    projectId: v.id("projects"),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    priority: v.number(), // 1 (Low) to 3 (High)
    order: v.optional(v.number()), // For Kanban ordering
    dueDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  }).index("by_user_project", ["userId", "projectId", "status"]),

  todos: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    plannedDate: v.optional(v.number()),
    pinForToday: v.boolean(),
    order: v.optional(v.number()),
  })
    .index("by_user_status", ["userId", "status"])
    .index("by_user_planned", ["userId", "plannedDate"])
    .index("by_user_pin", ["userId", "pinForToday"]),

  todoChecklist: defineTable({
    userId: v.string(),
    todoId: v.id("todos"),
    title: v.string(),
    status: v.union(v.literal("todo"), v.literal("done")),
    order: v.optional(v.number()),
  }).index("by_todo", ["todoId"]).index("by_user_todo", ["userId", "todoId"]),

  todoTaskLinks: defineTable({
    userId: v.string(),
    todoId: v.id("todos"),
    taskId: v.id("tasks"),
    taskStatus: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    linkedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_todo", ["todoId"])
    .index("by_task", ["taskId"])
    .index("by_user", ["userId"]),

  // --- ENGINEERING ---
  bugs: defineTable({
    userId: v.string(),
    title: v.string(),
    projectId: v.optional(v.id("projects")),
    description: v.string(),
    reproductionSteps: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("fixed")),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("critical")),
    links: v.optional(v.array(v.string())), // URLs to github or resources
  }).index("by_user", ["userId"]),

  prompts: defineTable({
    userId: v.string(),
    title: v.string(),
    content: v.string(), // The prompt template
    variables: v.optional(v.array(v.string())), // e.g. ["{{code}}", "{{language}}"]
    tags: v.array(v.string()),
    isFavorite: v.boolean(),
    lastUsed: v.optional(v.number()),
  })
  .searchIndex("search_content", { searchField: "content", filterFields: ["userId"] })
  .index("by_user", ["userId"]),

  // --- LEARNING (QURAN/ARABIC) ---
  vocab: defineTable({
    userId: v.string(),
    arabicText: v.string(),
    transliteration: v.optional(v.string()),
    translation: v.string(),
    root: v.optional(v.string()), // Trilateral root (e.g., "k-t-b")
    masteryLevel: v.number(), // 1-5
    nextReview: v.optional(v.number()), // Timestamp for spaced repetition
  }).index("by_user_root", ["userId", "root"]),

  notes: defineTable({
    userId: v.string(),
    content: v.string(),
    type: v.union(v.literal("general"), v.literal("tafsir"), v.literal("code_snippet")),
    relatedId: v.optional(v.string()), // Generic link to other IDs if needed
  }).index("by_user", ["userId"]),
});
