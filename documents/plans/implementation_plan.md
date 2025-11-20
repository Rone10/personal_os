# Personal OS Implementation Plan

**Overall Progress:** `0%`

## Summary
This plan outlines the steps to transform the current template into "Personal OS"—a unified dashboard for projects, tasks, bugs, prompts, and study. The implementation will retain WorkOS for authentication but will enforce data isolation using `userId` in the Convex schema. The project will adhere to a "Clean Industrial" design with a fixed sidebar and global command palette.

## Phases

### Phase 1: Cleanup & Foundation
*Goal: Prepare the workspace, define the data model, and establish the layout shell.*

- [ ] 🟥 **Step 1.1: Cleanup Existing Code**
  - [ ] 🟥 Remove `convex/myFunctions.ts` and `convex/numbers.ts` (if exists).
  - [ ] 🟥 Clear `app/page.tsx` content (prepare for Dashboard).
  - [ ] 🟥 Remove `app/server` folder (demo code).

- [ ] 🟥 **Step 1.2: Database Schema Implementation**
  - [ ] 🟥 Update `convex/schema.ts` with `projects`, `tasks`, `bugs`, `prompts`, `vocab`, `notes` tables.
  - [ ] 🟥 **Crucial:** Add `userId: v.string()` to ALL tables to ensure multi-tenancy support.
  - [ ] 🟥 Define indexes for efficient querying (e.g., `by_user_status`, `by_user_project`).

- [ ] 🟥 **Step 1.3: Global Layout & Navigation**
  - [ ] 🟥 Create `components/Sidebar.tsx` (Desktop fixed, Mobile collapsible).
  - [ ] 🟥 Implement `components/CommandPalette.tsx` (cmdk) for global actions.
  - [ ] 🟥 Update `app/layout.tsx` to include the Sidebar and Command Palette context.
  - [ ] 🟥 Ensure `ConvexClientProvider` wraps the application correctly.

### Phase 2: Backend Logic (Convex)
*Goal: Implement secure, user-scoped CRUD operations for all domains.*

- [ ] 🟥 **Step 2.1: Projects & Tasks API**
  - [ ] 🟥 Create `convex/projects.ts`: `get`, `create`, `updateStatus` (all scoped by `userId`).
  - [ ] 🟥 Create `convex/tasks.ts`: `getByProject`, `getToday`, `create`, `toggle` (all scoped by `userId`).

- [ ] 🟥 **Step 2.2: Engineering & Prompts API**
  - [ ] 🟥 Create `convex/bugs.ts`: `get`, `create`, `updateStatus` (scoped by `userId`).
  - [ ] 🟥 Create `convex/prompts.ts`: `getAll`, `create`, `toggleFavorite` (scoped by `userId`).

- [ ] 🟥 **Step 2.3: Study API**
  - [ ] 🟥 Create `convex/study.ts`: `getVocab`, `addVocab`, `reviewVocab` (scoped by `userId`).

### Phase 3: Feature Implementation (Frontend)
*Goal: Build the UI views using the "Vertical Slice" approach within `app/`.*

- [ ] 🟥 **Step 3.1: Dashboard (The Cockpit)**
  - [ ] 🟥 Implement `app/page.tsx`.
  - [ ] 🟥 Build "Today's Focus" widget (Tasks due today).
  - [ ] 🟥 Build "Quick Stats" widget.
  - [ ] 🟥 Build "Recent Vocab" widget.

- [ ] 🟥 **Step 3.2: Project Hub**
  - [ ] 🟥 Implement `app/projects/page.tsx` (Grid view of projects).
  - [ ] 🟥 Implement `app/projects/[id]/page.tsx` (Project Detail).
  - [ ] 🟥 Create `components/ProjectCard.tsx` and `components/KanbanBoard.tsx`.

- [ ] 🟥 **Step 3.3: Study Center**
  - [ ] 🟥 Implement `app/study/page.tsx`.
  - [ ] 🟥 Create `components/VocabList.tsx` (Table view).
  - [ ] 🟥 Create `components/Flashcard.tsx` (Review mode).

- [ ] 🟥 **Step 3.4: Prompt Library & Bugs**
  - [ ] 🟥 Implement `app/prompts/page.tsx` (List with copy-to-clipboard).
  - [ ] 🟥 Implement `app/bugs/page.tsx` (or integrate into Project Detail).

### Phase 4: Polish & Refinement
*Goal: Ensure high-quality UX and visual consistency.*

- [ ] 🟥 **Step 4.1: Theming & UI Polish**
  - [ ] 🟥 Verify Dark Mode/Light Mode consistency (Slate palette).
  - [ ] 🟥 Apply semantic colors (Blue for Tasks, Emerald for Study, etc.).
  - [ ] 🟥 Ensure Arabic font rendering is correct (`dir="rtl"`).

- [ ] 🟥 **Step 4.2: Final Testing**
  - [ ] 🟥 Verify data isolation (User A cannot see User B's data).
  - [ ] 🟥 Test Command Palette shortcuts.
  - [ ] 🟥 Check mobile responsiveness.
