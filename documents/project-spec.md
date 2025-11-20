# AI Agent Implementation Guide: Personal OS

1. Project Context & Role

Role: You are a Senior Full-Stack Engineer specializing in Next.js (App Router) and ConvexDB.
Goal: Build a "Personal OS" web application—a unified dashboard for managing coding projects, bug tracking, prompt engineering, and Arabic/Quran study.
Core Philosophy: The app must be "low friction" for quick capture and rely heavily on Convex's real-time reactivity.

2. Tech Stack & Constraints

Framework: Next.js 14+ (App Router).

Database / Backend: Convex (hosted relational document store).

Styling: Tailwind CSS + lucide-react for icons.

UI Components: shadcn/ui (recommended for speed) or raw Tailwind.

Authentication: Convex Auth (or Clerk via Convex).

Language: TypeScript.

3. Phase 1: Initialization & Schema

Objective: Set up the project structure and define the database schema immediately.

# Step 1.1: Project Setup

Initialize a Next.js app with Convex.



# Step 1.2: Database Schema

Create convex/schema.ts. Use the following strict schema definition to support all features:

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // --- PROJECTS & TASKS ---
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived"), v.literal("idea")),
    icon: v.optional(v.string()), // Emoji or icon name
    slug: v.string(),
  }).index("by_status", ["status"]),

  tasks: defineTable({
    title: v.string(),
    projectId: v.id("projects"),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    priority: v.number(), // 1 (Low) to 3 (High)
    dueDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  }).index("by_project", ["projectId", "status"]),

  // --- ENGINEERING ---
  bugs: defineTable({
    title: v.string(),
    projectId: v.optional(v.id("projects")),
    description: v.string(),
    reproductionSteps: v.optional(v.string()),
    status: v.literal("open", "fixed"),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("critical")),
    links: v.optional(v.array(v.string())), // URLs to github or resources
  }),

  prompts: defineTable({
    title: v.string(),
    content: v.string(), // The prompt template
    variables: v.optional(v.array(v.string())), // e.g. ["{{code}}", "{{language}}"]
    tags: v.array(v.string()),
    isFavorite: v.boolean(),
    lastUsed: v.optional(v.number()),
  }).searchIndex("search_content", { searchField: "content" }),

  // --- LEARNING (QURAN/ARABIC) ---
  vocab: defineTable({
    arabicText: v.string(),
    transliteration: v.optional(v.string()),
    translation: v.string(),
    root: v.optional(v.string()), // Trilateral root (e.g., "k-t-b")
    masteryLevel: v.number(), // 1-5
    nextReview: v.optional(v.number()), // Timestamp for spaced repetition
  }).index("by_root", ["root"]),

  notes: defineTable({
    content: v.string(),
    type: v.union(v.literal("general"), v.literal("tafsir"), v.literal("code_snippet")),
    relatedId: v.optional(v.string()), // Generic link to other IDs if needed
  }),
});


4. Phase 2: Backend Implementation (Convex)

Objective: Create the "API" layer using Convex functions.

Required Mutations & Queries

Create these files in the convex/ folder:

convex/projects.ts

get: Query all active projects.

create: Mutation to add a project.

updateStatus: Mutation to archive/activate.

**convex/tasks.ts

getByProject: Query tasks for a specific projectId.

getToday: Query tasks due today or marked "in_progress".

toggle: Mutation to switch status between todo/done.

create: Mutation to add a task (parse #tags from title if possible).

convex/study.ts

getVocab: Query vocab, allow filtering by root.

addVocab: Mutation.

reviewVocab: Mutation to update masteryLevel and nextReview.

convex/actions/quran.ts (Optional)

Create a Convex Action that fetches verse data from api.quran.com if the user inputs a reference like "2:255".

5. Phase 3: Frontend Implementation

Objective: Build the Dashboard and specialized views.

Global Layout (app/layout.tsx)

Implement a persistent Sidebar on desktop (collapsible on mobile).

Navigation Items: Dashboard, Projects, Tasks, Study (Quran/Vocab), Prompts, Bugs.

Global Command Palette (Cmd+K):

Use cmdk (or shadcn Command component).

Must be available globally.

Actions: "Create Task", "Log Bug", "Add Vocab", "Search Prompts".

Core Pages

Dashboard (/)

"Today's Focus": List of tasks marked in_progress or due today.

"Quick Stats": Count of open bugs, active projects.

"Recent Vocab": 3-5 recently added words.

Project Hub (/projects)

Grid view of Project Cards.

Clicking a card goes to /projects/[id].

Project Detail (/projects/[id])

Unified view containing:

Task List (Kanban or List).

Bugs associated with this project.

Notes/Ideas.

Study Center (/study)

Tab 1: Vocab: List view with columns for Arabic, Root, Meaning.

Tab 2: Flashcard: A simple mode to cycle through words with low mastery.

Prompt Library (/prompts)

List of prompts.

"Copy" button: Copies content to clipboard immediately.

"Run" button: (Future) Opens a playground.

6. Implementation Details & UX Guidelines

Data Fetching: Always use useQuery for data. Do not use useEffect to fetch data.

Mutations: Use useMutation for interactions. Implement Optimistic Updates for Task checkboxes to ensure instant feedback.

Arabic Text: Ensure the font family supports Arabic cleanly (e.g., Noto Sans Arabic or standard system fallbacks) and set dir="rtl" on specific Arabic text containers.

Theme: Support Dark Mode (default for developer tools).

7. Folder Structure (Vertical Slice Architecture)

Adopt VSA principles: organize code by feature/route using src/ directory. Co-locate components inside _components folders within the relevant route.

src/
├── app/
│   ├── (main)/                   # Authenticated/Dashboard Layout
│   │   ├── page.tsx              # Dashboard Page
│   │   ├── _components/          # Dashboard-specific widgets
│   │   │   ├── TaskWidget.tsx
│   │   │   └── VocabWidget.tsx
│   │   │
│   │   ├── projects/
│   │   │   ├── page.tsx          # Project Hub
│   │   │   ├── _components/      # Hub-specific components
│   │   │   │   └── ProjectCard.tsx
│   │   │   │
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Project Details
│   │   │       └── _components/  # Detail-specific components
│   │   │           ├── KanbanBoard.tsx
│   │   │           └── BugList.tsx
│   │   │
│   │   ├── study/
│   │   │   ├── page.tsx
│   │   │   └── _components/
│   │   │       ├── Flashcard.tsx
│   │   │       └── VocabList.tsx
│   │   │
│   │   ├── prompts/
│   │   │   ├── page.tsx
│   │   │   └── _components/
│   │   │       └── PromptItem.tsx
│   │   │
│   │   └── layout.tsx            # Global Sidebar + Providers
│   │
│   └── layout.tsx                # Root HTML/Body
│
├── components/                   # SHARED UI ONLY
│   └── ui/                       # shadcn/ui components (Button, Card, Input)
│
├── lib/
│   └── utils.ts                  # Tailwind merge utility
│
└── convex/                       # Backend Functions (Centralized)
    ├── schema.ts
    ├── tasks.ts
    └── projects.ts


8. Next Steps for You (The Agent)

Generate the convex/schema.ts file.

Create the ConvexClientProvider.

Build the Sidebar and Layout in src/app/(main)/layout.tsx.

Implement the Dashboard page with dummy data, then wire up the backend.