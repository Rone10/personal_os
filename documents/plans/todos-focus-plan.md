# Todos + Today Focus Plan

**Overall Progress:** `84%`

## Summary

Enhance the dashboard's "Today's Focus" so personal todos and project subtasks coexist seamlessly. Introduce a dedicated todos data model (with checklist support) that can link each todo to zero or more project subtasks (each task belongs to at most one todo). Provide low-friction creation, manual linking, warnings on relink, aggregated progress that auto-completes the parent when all subtasks finish, and a prompt before cascading completion to child tasks. Integrations will surface linked subtasks (with jump-to-project controls) directly inside the dashboard while still allowing todos to stand alone for personal items scheduled or pinned for the day.

## Tasks

- [ ] 🟩 **Step 1: Extend Convex schema for todos**
  - [ ] 🟩 Add `todos` table (title, description, status, plannedDate, pinForToday, order, userId)
  - [ ] 🟩 Add `todoChecklist` table for per-todo checklist items with status tracking
  - [ ] 🟩 Add `todoTaskLinks` table storing `todoId`, `taskId`, cached status, and timestamps (enforce unique taskId)

- [ ] 🟩 **Step 2: Backend queries & mutations**
  - [ ] 🟩 Implement list/detail queries (`getTodayTodos`, `getTodoWithLinks`, `listTodos`) with auth + filtering by plannedDate/pin
  - [ ] 🟩 Implement mutations for CRUD (`createTodo`, `updateTodo`, `deleteTodo`), checklist item ops, and ordering updates
  - [ ] 🟩 Implement linking workflows (`linkTaskToTodo`, `unlinkTask`, `relinkTask`) that warn when a task already belongs to another todo
  - [ ] 🟩 Implement progress-sync logic that auto-completes parent todos when all linked tasks + checklist items are done and prompts before cascading completion downwards

- [ ] 🟩 **Step 3: UI components for Todos**
  - [ ] 🟩 Build reusable `TodoCard` with collapsed/expanded states, aggregated progress ring, checklist UI, and linked task preview
  - [ ] 🟩 Add quick-create input plus modal/palette for advanced creation (manual task selection, checklist seeding)
  - [ ] 🟩 Surface warnings + relink affordances when linking a task already attached elsewhere

- [ ] 🟩 **Step 4: Linking experience across Kanban & Todos**
  - [ ] 🟩 Provide picker to attach existing project tasks (filterable by project/status) when creating or editing a todo
  - [ ] 🟩 Add indicators inside Kanban cards showing their parent todo and allow opening/relinking from there
  - [ ] 🟩 Ensure status changes in Kanban immediately refresh linked todo progress and vice versa

- [ ] 🟩 **Step 5: Today’s Focus integration**
  - [ ] 🟩 Update `TodayFocus` component to display both project tasks and pinned/scheduled todos with clear grouping
  - [ ] 🟩 Enable inline actions: toggle todo status, open linked subtasks, jump to project boards, manage checklist items
  - [ ] 🟩 Respect manual inclusion (pin or planned date) so only intentional todos appear in Today’s Focus

- [ ] 🟥 **Step 6: Testing & UX polish**
  - [ ] 🟥 Add Convex test coverage (if available) or sanity scripts for new queries/mutations
  - [ ] 🟥 Verify edge cases: deleted tasks, relinking flow, prompt confirmation before marking subtasks done
  - [ ] 🟥 Review responsive/dark-mode styles and keyboard navigation for new UI elements
