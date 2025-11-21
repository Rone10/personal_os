# Personal OS Implementation Plan

**Overall Progress:** `100%`

## Summary
This plan outlines the steps to transform the current template into "Personal OS"—a unified dashboard for projects, tasks, bugs, prompts, and study. The implementation will retain WorkOS for authentication but will enforce data isolation using `userId` in the Convex schema. The project will adhere to a "Clean Industrial" design with a fixed sidebar and global command palette.

## Phases

### Phase 1: Cleanup & Foundation
*Goal: Prepare the workspace, define the data model, and establish the layout shell.*

- [x] 🟩 **Step 1.1: Cleanup Existing Code**
  - [x] 🟩 Remove `convex/myFunctions.ts` and `convex/numbers.ts` (if exists).
  - [x] 🟩 Clear `app/page.tsx` content (prepare for Dashboard).
  - [x] 🟩 Remove `app/server` folder (demo code).

- [x] 🟩 **Step 1.2: Database Schema Implementation**
  - [x] 🟩 Update `convex/schema.ts` with `projects`, `tasks`, `bugs`, `prompts`, `vocab`, `notes` tables.
  - [x] 🟩 **Crucial:** Add `userId: v.string()` to ALL tables to ensure multi-tenancy support.
  - [x] 🟩 Define indexes for efficient querying (e.g., `by_user_status`, `by_user_project`).

- [x] 🟩 **Step 1.3: Global Layout & Navigation**
  - [x] 🟩 Create `components/Sidebar.tsx` (Desktop fixed, Mobile collapsible).
  - [x] 🟩 Implement `components/CommandPalette.tsx` (cmdk) for global actions.
  - [x] 🟩 Update `app/layout.tsx` to include the Sidebar and Command Palette context.
  - [x] 🟩 Ensure `ConvexClientProvider` wraps the application correctly.

### Phase 2: Backend Logic (Convex)
*Goal: Implement secure, user-scoped CRUD operations for all domains.*

- [x] 🟩 **Step 2.1: Projects & Tasks API**
  - [x] 🟩 Create `convex/projects.ts`: `get`, `create`, `updateStatus` (all scoped by `userId`).
  - [x] 🟩 Create `convex/tasks.ts`: `getByProject`, `getToday`, `create`, `toggle` (all scoped by `userId`).

- [x] 🟩 **Step 2.2: Engineering & Prompts API**
  - [x] 🟩 Create `convex/bugs.ts`: `get`, `create`, `updateStatus` (scoped by `userId`).
  - [x] 🟩 Create `convex/prompts.ts`: `getAll`, `create`, `toggleFavorite` (scoped by `userId`).

- [x] 🟩 **Step 2.3: Study API**
  - [x] 🟩 Create `convex/study.ts`: `getVocab`, `addVocab`, `reviewVocab` (scoped by `userId`).

### Phase 3: Feature Implementation (Frontend)
*Goal: Build the UI views using the "Vertical Slice" approach within `app/`.*

- [x] 🟩 **Step 3.1: Dashboard (The Cockpit)**
  - [x] 🟩 Implement `app/page.tsx`.
  - [x] 🟩 Build "Today's Focus" widget (Tasks due today).
  - [x] 🟩 Build "Quick Stats" widget.
  - [x] 🟩 Build "Recent Vocab" widget.

- [x] 🟩 **Step 3.2: Project Hub**
  - [x] 🟩 Implement `app/projects/page.tsx` (Grid view of projects).
  - [x] 🟩 Implement `app/projects/[id]/page.tsx` (Project Detail).
  - [x] 🟩 Create `components/ProjectCard.tsx` and `components/KanbanBoard.tsx`.

- [x] 🟩 **Step 3.3: Study Center**
  - [x] 🟩 Implement `app/study/page.tsx`.
  - [x] 🟩 Create `components/VocabList.tsx` (Table view).
  - [x] 🟩 Create `components/Flashcard.tsx` (Review mode).

- [x] 🟩 **Step 3.4: Prompt Library & Bugs**
  - [x] 🟩 Implement `app/prompts/page.tsx` (List with copy-to-clipboard).
  - [x] 🟩 Implement `app/bugs/page.tsx` (or integrate into Project Detail).

### Phase 4: Polish & Refinement
*Goal: Ensure high-quality UX and visual consistency.*

- [x] 🟩 **Step 4.1: Theming & UI Polish**
  - [x] 🟩 Verify Dark Mode/Light Mode consistency (Slate palette).
  - [x] 🟩 Apply semantic colors (Blue for Tasks, Emerald for Study, etc.).
  - [x] 🟩 Ensure Arabic font rendering is correct (`dir="rtl"`).

- [x] 🟩 **Step 4.2: Final Testing**
  - [x] 🟩 Verify data isolation (User A cannot see User B's data).
  - [x] 🟩 Test Command Palette shortcuts.
  - [x] 🟩 Check mobile responsiveness.
