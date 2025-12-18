import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // --- PROJECTS & TASKS ---
  projects: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived"), v.literal("idea")),
    type: v.optional(v.union(v.literal("coding"), v.literal("general"))),
    icon: v.optional(v.string()), // Emoji or icon name
    slug: v.string(),
  })
    .index("by_user_status", ["userId", "status"])
    .index("by_user_type", ["userId", "type"]),

  tasks: defineTable({
    userId: v.string(),
    title: v.string(),
    projectId: v.id("projects"),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    priority: v.number(), // Legacy numeric priority kept for compatibility
    priorityLevel: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent"),
        v.literal("critical"),
      ),
    ),
    description: v.optional(v.string()),
    assignees: v.optional(v.array(v.string())),
    attachments: v.optional(v.array(v.string())),
    order: v.optional(v.number()), // For Kanban ordering
    dueDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    featureId: v.optional(v.id("projectFeatures")),
    featureChecklistItemId: v.optional(v.id("featureChecklistItems")),
  })
    .index("by_user_project", ["userId", "projectId", "status"])
    .index("by_feature", ["featureId"])
    .index("by_checklist_item", ["featureChecklistItemId"]),

  projectFeatures: defineTable({
    userId: v.string(),
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    whatDoneLooksLike: v.optional(v.string()),
    order: v.number(),
  })
    .index("by_project", ["projectId", "order"])
    .index("by_user_project", ["userId", "projectId"]),

  featureChecklistItems: defineTable({
    userId: v.string(),
    projectId: v.id("projects"),
    featureId: v.id("projectFeatures"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("todo"), v.literal("done")),
    order: v.number(),
    linkedTaskIds: v.optional(v.array(v.id("tasks"))),
  })
    .index("by_feature", ["featureId", "order"])
    .index("by_project", ["projectId", "featureId"]),

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
    // Compatibility field: set after migrating this vocab row into `studyWords`.
    migratedToWordId: v.optional(v.id("studyWords")),
  }).index("by_user_root", ["userId", "root"]),

  // --- STUDY CENTER (QURAN/ARABIC) v2 ---
  //
  // These tables implement a structured “capture and retrieve” workflow:
  // - Words and phrases are stored separately.
  // - Each word/phrase/passage can have multiple meanings from different sources.
  // - Meanings can have references (Quran ranges, structured hadith, or other sources).
  // - Words can link to phrase examples.
  // - Notes store personal reflections (not a “source”).

  studyWords: defineTable({
    userId: v.string(),
    arabicText: v.string(),
    arabicNormalized: v.string(), // For diacritics-insensitive search
    transliteration: v.optional(v.string()),
    root: v.optional(v.string()),
    masteryLevel: v.number(), // 1-5
    nextReview: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_root", ["userId", "root"]),

  studyPhrases: defineTable({
    userId: v.string(),
    arabicText: v.string(),
    arabicNormalized: v.string(), // For diacritics-insensitive search
    transliteration: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  studyQuranPassages: defineTable({
    userId: v.string(),
    surah: v.number(),
    ayahStart: v.number(),
    ayahEnd: v.optional(v.number()),
    arabicText: v.string(),
    arabicNormalized: v.string(), // For diacritics-insensitive search
  }).index("by_user_surah", ["userId", "surah", "ayahStart"]),

  studySources: defineTable({
    userId: v.string(),
    kind: v.union(
      v.literal("quran_translation"),
      v.literal("tafsir"),
      v.literal("hadith"),
      v.literal("dictionary"),
      v.literal("other"),
    ),
    title: v.optional(v.string()),
    url: v.optional(v.string()),
    author: v.optional(v.string()),
    lastUsedAt: v.optional(v.number()),
  }).index("by_user_kind", ["userId", "kind"]),

  studyMeanings: defineTable({
    userId: v.string(),
    ownerType: v.union(v.literal("word"), v.literal("phrase"), v.literal("quran_passage")),
    ownerId: v.string(), // stores the Convex document id as a string (Id<...>)
    text: v.string(),
    language: v.optional(v.string()),
    sourceId: v.optional(v.id("studySources")),
    isPrimary: v.boolean(),
    order: v.number(),
  }).index("by_user_owner", ["userId", "ownerType", "ownerId", "order"]),

  studyReferences: defineTable({
    userId: v.string(),
    meaningId: v.id("studyMeanings"),
    type: v.union(v.literal("quran"), v.literal("hadith"), v.literal("other")),

    // Quran range reference
    quranSurah: v.optional(v.number()),
    quranAyahStart: v.optional(v.number()),
    quranAyahEnd: v.optional(v.number()),

    // Structured hadith reference
    hadithCollection: v.optional(v.string()),
    hadithNumber: v.optional(v.string()),
    hadithBook: v.optional(v.string()),
    hadithChapter: v.optional(v.string()),
    hadithGrade: v.optional(v.string()),
    hadithNarrator: v.optional(v.string()),

    // Optional metadata for “other” (and optionally for any reference type)
    title: v.optional(v.string()),
    url: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_meaning", ["meaningId"])
    .index("by_user", ["userId"]),

  studyNotes: defineTable({
    userId: v.string(),
    ownerType: v.union(v.literal("word"), v.literal("phrase"), v.literal("quran_passage")),
    ownerId: v.string(), // stores the Convex document id as a string (Id<...>)
    content: v.string(),
    updatedAt: v.number(),
  }).index("by_user_owner", ["userId", "ownerType", "ownerId"]),

  studyWordPhraseLinks: defineTable({
    userId: v.string(),
    wordId: v.id("studyWords"),
    phraseId: v.id("studyPhrases"),
    order: v.optional(v.number()),
  })
    .index("by_user_word", ["userId", "wordId"])
    .index("by_user_phrase", ["userId", "phraseId"]),

  notes: defineTable({
    userId: v.string(),
    content: v.string(),
    type: v.union(v.literal("general"), v.literal("tafsir"), v.literal("code_snippet")),
    relatedId: v.optional(v.string()), // Generic link to other IDs if needed
  }).index("by_user", ["userId"]),
});
