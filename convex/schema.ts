import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // --- PROJECTS & TASKS ---
  projects: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    descriptionJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    status: v.union(v.literal("active"), v.literal("archived"), v.literal("idea")),
    type: v.optional(v.union(v.literal("coding"), v.literal("general"))),
    icon: v.optional(v.string()), // Emoji or icon name
    slug: v.string(),
    // Timestamps
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user_status", ["userId", "status"])
    .index("by_user_type", ["userId", "type"]),

  // --- MILESTONES ---
  // Organizes work into time-boxed release phases (MVP, Phase 2, etc.)
  milestones: defineTable({
    userId: v.string(),
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    targetDate: v.optional(v.number()),
    status: v.union(
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("completed")
    ),
    order: v.number(),
    color: v.optional(v.string()), // For visual distinction in timeline
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId", "order"])
    .index("by_user_project", ["userId", "projectId"]),

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
    descriptionJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    assignees: v.optional(v.array(v.string())),
    attachments: v.optional(v.array(v.string())),
    order: v.optional(v.number()), // For Kanban ordering
    dueDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    featureId: v.optional(v.id("projectFeatures")),
    featureChecklistItemId: v.optional(v.id("featureChecklistItems")),
    // Milestone association
    milestoneId: v.optional(v.id("milestones")),
    // Timestamps
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()), // When status changed to "done"
  })
    .index("by_user_project", ["userId", "projectId", "status"])
    .index("by_feature", ["featureId"])
    .index("by_checklist_item", ["featureChecklistItemId"])
    .index("by_milestone", ["milestoneId"]),

  // --- SUBTASKS ---
  // Breaks tasks into checkable items
  subtasks: defineTable({
    userId: v.string(),
    taskId: v.id("tasks"),
    title: v.string(),
    status: v.union(v.literal("todo"), v.literal("done")),
    order: v.number(),
    createdAt: v.number(),
  })
    .index("by_task", ["taskId", "order"])
    .index("by_user_task", ["userId", "taskId"]),

  projectFeatures: defineTable({
    userId: v.string(),
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    descriptionJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    whatDoneLooksLike: v.optional(v.string()),
    whatDoneLooksLikeJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    order: v.number(),
    // Timestamps
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_project", ["projectId", "order"])
    .index("by_user_project", ["userId", "projectId"]),

  featureChecklistItems: defineTable({
    userId: v.string(),
    projectId: v.id("projects"),
    featureId: v.id("projectFeatures"),
    title: v.string(),
    description: v.optional(v.string()),
    descriptionJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    status: v.union(v.literal("todo"), v.literal("done")),
    order: v.number(),
    linkedTaskIds: v.optional(v.array(v.id("tasks"))),
    // Timestamps
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_feature", ["featureId", "order"])
    .index("by_project", ["projectId", "featureId"]),

  todos: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    descriptionJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
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
    descriptionJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    reproductionSteps: v.optional(v.string()),
    reproductionStepsJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    status: v.union(v.literal("open"), v.literal("fixed")),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("critical")),
    links: v.optional(v.array(v.string())), // URLs to github or resources
  }).index("by_user", ["userId"]),

  prompts: defineTable({
    userId: v.string(),
    title: v.string(),
    content: v.string(), // The prompt template
    contentJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    variables: v.optional(v.array(v.string())), // e.g. ["{{code}}", "{{language}}"]
    tags: v.array(v.string()),
    isFavorite: v.boolean(),
    lastUsed: v.optional(v.number()),
  })
  .searchIndex("search_content", { searchField: "content", filterFields: ["userId"] })
  .index("by_user", ["userId"]),

  // =============================================================================
  // ARABIC KNOWLEDGE RETENTION SYSTEM
  // =============================================================================
  //
  // A comprehensive system for studying Arabic through Quran and Hadith.
  // Features: Root-based vocabulary, inline note references, bi-directional
  // backlinks, courses/books hierarchy, and robust Arabic search.

  // --- ROOTS ---
  // The foundational unit for Arabic vocabulary. All Arabic words derive from roots.
  roots: defineTable({
    userId: v.string(),
    letters: v.string(), // Arabic root letters (e.g., "ك-ت-ب")
    latinized: v.string(), // Romanized form for search (e.g., "k-t-b")
    coreMeaning: v.string(), // General semantic field in English
    notes: v.optional(v.string()),
    notesJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_latinized", ["userId", "latinized"])
    .index("by_user_letters", ["userId", "letters"]),

  // --- WORDS ---
  // Individual vocabulary entries. Arabic words link to a Root.
  words: defineTable({
    userId: v.string(),
    text: v.string(), // The word as entered (with diacritics)
    language: v.union(v.literal("arabic"), v.literal("english")),
    rootId: v.optional(v.id("roots")), // Reference to Root (Arabic only)
    type: v.optional(
      v.union(v.literal("harf"), v.literal("ism"), v.literal("fiil")),
    ), // Part of speech (Arabic only)
    wazan: v.optional(v.string()), // Morphological pattern (e.g., فَاعِل)
    meanings: v.array(
      v.object({
        definition: v.string(),
        usageContext: v.optional(v.string()),
        examples: v.optional(v.array(v.string())),
      }),
    ),
    grammaticalInfo: v.optional(
      v.object({
        gender: v.optional(
          v.union(
            v.literal("masculine"),
            v.literal("feminine"),
            v.literal("both"),
          ),
        ),
        number: v.optional(
          v.union(v.literal("singular"), v.literal("dual"), v.literal("plural")),
        ),
        caseEndings: v.optional(v.string()),
        conjugations: v.optional(v.string()),
        nounType: v.optional(v.string()), // e.g., "masdar", "ism fa'il"
        verbForm: v.optional(v.number()), // Form I-X for verbs
      }),
    ),
    transliteration: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())), // Alternate spellings
    notes: v.optional(v.string()),
    notesJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    // Search fields
    normalizedText: v.string(), // Tatweel removed, alef/hamza PRESERVED
    diacriticStrippedText: v.string(), // For fuzzy search (tashkeel removed)
    searchTokens: v.optional(v.array(v.string())),
    // Flashcard/SRS fields
    masteryLevel: v.optional(v.number()), // 1-5
    nextReview: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_root", ["userId", "rootId"])
    .index("by_user_language", ["userId", "language"])
    .index("by_user_type", ["userId", "type"]),

  // --- VERSES ---
  // Quran verses (individual or ranges)
  // Supports both legacy single translation and new multi-translation format
  verses: defineTable({
    userId: v.string(),
    surahNumber: v.number(), // 1-114
    surahNameArabic: v.optional(v.string()),
    surahNameEnglish: v.optional(v.string()),
    ayahStart: v.number(),
    ayahEnd: v.optional(v.number()), // Optional for ranges
    arabicText: v.string(), // Concatenated Arabic text (legacy, kept for search)
    translation: v.optional(v.string()), // Legacy single translation (kept for migration)
    // NEW: Structured ayahs with individual translations
    ayahs: v.optional(
      v.array(
        v.object({
          ayahNumber: v.number(),
          arabicText: v.string(),
          translations: v.array(
            v.object({
              sourceId: v.string(), // e.g., "20" for Sahih International
              sourceName: v.string(), // e.g., "Sahih International"
              text: v.string(), // The translation text
              sourceType: v.union(v.literal("api"), v.literal("custom")),
            })
          ),
        })
      )
    ),
    topic: v.optional(v.string()), // Topic/theme for categorization
    normalizedText: v.string(),
    diacriticStrippedText: v.string(),
    searchTokens: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_surah", ["userId", "surahNumber", "ayahStart"]),

  // --- HADITHS ---
  hadiths: defineTable({
    userId: v.string(),
    collection: v.string(), // Bukhari, Muslim, Tirmidhi, etc.
    bookName: v.optional(v.string()),
    hadithNumber: v.string(),
    grading: v.optional(
      v.union(
        v.literal("sahih"),
        v.literal("hasan"),
        v.literal("daif"),
        v.literal("mawdu"),
      ),
    ),
    arabicText: v.string(),
    translation: v.optional(v.string()), // English translation
    topic: v.optional(v.string()), // Topic/theme for categorization
    narratorChain: v.optional(v.string()), // The isnad
    normalizedText: v.string(),
    diacriticStrippedText: v.string(),
    searchTokens: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_collection", ["userId", "collection"]),

  // --- COURSES ---
  courses: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    descriptionJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    source: v.optional(v.string()), // Instructor, platform, URL
    order: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // --- LESSONS (belong to a Course) ---
  lessons: defineTable({
    userId: v.string(),
    courseId: v.id("courses"),
    title: v.string(),
    content: v.optional(v.string()),
    contentJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_course", ["courseId", "order"]),

  // --- BOOKS ---
  books: defineTable({
    userId: v.string(),
    title: v.string(),
    author: v.optional(v.string()),
    description: v.optional(v.string()),
    descriptionJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    order: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // --- CHAPTERS (belong to a Book) ---
  chapters: defineTable({
    userId: v.string(),
    bookId: v.id("books"),
    title: v.string(),
    content: v.optional(v.string()),
    contentJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_book", ["bookId", "order"]),

  // --- NOTES ---
  // Free-text notes with inline references. Can belong to a Lesson, Chapter, or stand alone.
  studyNotes: defineTable({
    userId: v.string(),
    title: v.optional(v.string()),
    content: v.string(), // Plain text content
    contentJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    // Extracted references from rich text for backlink queries
    extractedReferences: v.optional(
      v.array(
        v.object({
          targetType: v.string(),
          targetId: v.string(),
          displayText: v.string(),
        })
      )
    ),
    // Legacy fields for backwards compatibility during transition
    ownerType: v.optional(
      v.union(
        v.literal("word"),
        v.literal("phrase"),
        v.literal("quran_passage"),
      ),
    ),
    ownerId: v.optional(v.string()),
    // New parent fields
    parentType: v.optional(
      v.union(
        v.literal("lesson"),
        v.literal("chapter"),
        v.literal("verse"),
        v.literal("hadith"),
        v.literal("word"),
        v.literal("standalone"), // Atomic notes with no parent
      ),
    ),
    parentId: v.optional(v.string()),
    // Inline references with character positions
    references: v.optional(
      v.array(
        v.object({
          targetType: v.union(
            v.literal("word"),
            v.literal("verse"),
            v.literal("hadith"),
            v.literal("lesson"),
            v.literal("chapter"),
            v.literal("root"),
            // Extended reference types
            v.literal("tag"),
            v.literal("course"),
            v.literal("book"),
            v.literal("note"),
          ),
          targetId: v.string(),
          startOffset: v.number(),
          endOffset: v.number(),
          displayText: v.string(),
        }),
      ),
    ),
    externalLinks: v.optional(
      v.array(
        v.object({
          url: v.string(),
          label: v.string(),
        }),
      ),
    ),
    normalizedText: v.optional(v.string()),
    searchTokens: v.optional(v.array(v.string())),
    createdAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_parent", ["userId", "parentType", "parentId"])
    .index("by_user_owner", ["userId", "ownerType", "ownerId"]),

  // --- EXPLANATIONS ---
  // Separates interpretations from notes. One word/verse can have multiple explanations.
  explanations: defineTable({
    userId: v.string(),
    content: v.string(),
    contentJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    sourceType: v.union(
      v.literal("lesson"),
      v.literal("chapter"),
      v.literal("personal"),
      v.literal("external"),
    ),
    sourceId: v.optional(v.string()), // If from lesson/chapter, link to it
    sourceLabel: v.optional(v.string()), // e.g., "Sheikh X's tafsir"
    subjectType: v.union(
      v.literal("word"),
      v.literal("verse"),
      v.literal("hadith"),
      v.literal("root"),
    ),
    subjectId: v.string(),
    order: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_subject", ["subjectType", "subjectId"]),

  // --- TAGS ---
  tags: defineTable({
    userId: v.string(),
    name: v.string(), // e.g., "Patience", "Day of Judgment"
    description: v.optional(v.string()),
    descriptionJson: v.optional(v.any()), // Rich text content (Tiptap JSON)
    color: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_name", ["userId", "name"]),

  // --- ENTITY TAGS (Many-to-Many Join) ---
  entityTags: defineTable({
    userId: v.string(),
    tagId: v.id("tags"),
    entityType: v.union(
      v.literal("word"),
      v.literal("verse"),
      v.literal("hadith"),
      v.literal("note"),
      v.literal("lesson"),
      v.literal("chapter"),
      v.literal("root"),
      v.literal("explanation"),
      v.literal("course"),
      v.literal("book"),
    ),
    entityId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_tag", ["tagId"])
    .index("by_entity", ["entityType", "entityId"]),

  // --- BACKLINKS (Derived/Maintained) ---
  // Updated automatically when a Note is saved. Enables fast "what references this?" queries.
  backlinks: defineTable({
    userId: v.string(),
    targetType: v.string(), // Type of referenced entity
    targetId: v.string(), // ID of referenced entity
    noteId: v.id("studyNotes"), // The note that contains the reference
    snippet: v.string(), // Context snippet from the note
    startOffset: v.number(),
    endOffset: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_note", ["noteId"]),

  // --- ENTITY LINKS ---
  // Direct relationships between entities (beyond note-based backlinks).
  // Enables thematic study, synonym/antonym relationships, etc.
  entityLinks: defineTable({
    userId: v.string(),
    sourceType: v.union(
      v.literal("word"),
      v.literal("verse"),
      v.literal("hadith"),
      v.literal("root"),
      v.literal("note"),
    ),
    sourceId: v.string(),
    targetType: v.union(
      v.literal("word"),
      v.literal("verse"),
      v.literal("hadith"),
      v.literal("root"),
      v.literal("note"),
    ),
    targetId: v.string(),
    relationshipType: v.union(
      v.literal("related"), // General relationship
      v.literal("synonym"), // Same/similar meaning (words)
      v.literal("antonym"), // Opposite meaning (words)
      v.literal("explains"), // One explains the other
      v.literal("derived_from"), // Derivation (word from root)
      v.literal("contrasts"), // Shows contrast
      v.literal("supports"), // Supporting evidence
      v.literal("example_of"), // Instance/example
    ),
    note: v.optional(v.string()), // Context for why they're linked
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_source", ["userId", "sourceType", "sourceId"])
    .index("by_target", ["userId", "targetType", "targetId"]),

  // --- COLLECTIONS ---
  // Curated topic hubs with narrative and custom ordering.
  // Aggregates entities into meaningful groupings for thematic study.
  collections: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    contentJson: v.optional(v.any()), // Rich text introduction/narrative
    items: v.array(
      v.object({
        entityType: v.string(), // word, verse, hadith, root, note, lesson, chapter
        entityId: v.string(),
        order: v.number(),
        annotation: v.optional(v.string()), // Why this item is included
      })
    ),
    tags: v.optional(v.array(v.id("tags"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),
});
