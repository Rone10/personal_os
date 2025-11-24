# Kanban Priority & Quick Edit Plan

**Overall Progress:** `100%`

Personal OS currently renders Kanban cards with limited priority states, no expandable detail view, and no inline editing. This plan outlines the backend schema updates, frontend state management, UI enhancements, and dialog workflow required to add five-level priorities, collapsible details, and a quick-edit modal while preserving the existing drag-and-drop experience.

## Tasks

- [x] 🟩 **Step 1: Extend Convex schema & APIs**
  - [x] 🟩 Update `tasks` table to include `priorityLevel` (low/medium/high/urgent/critical), `description`, `assignees` (string array), `attachments` (URL array).
  - [x] 🟩 Migrate/create data mapping from legacy numeric priority to the new enum defaulting to low.
  - [x] 🟩 Add `updateTask` mutation (and associated validation) covering title, description, priority, due date, assignees, attachments, and status, ensuring linked todos stay in sync.

- [x] 🟩 **Step 2: Wire frontend data layer**
  - [x] 🟩 Adjust Convex `api.tasks` client types/hooks to expose new fields and mutation.
  - [x] 🟩 Expand Kanban board state to consume/edit the new task properties while keeping optimistic updates aligned with drag events.

- [x] 🟩 **Step 3: Redesign task cards for priority & details**
  - [x] 🟩 Introduce a consistent collapsed card layout showing title plus a priority badge/stripe, with uniform sizing across statuses and the drag overlay.
  - [x] 🟩 Add per-card expand/collapse state with a chevron toggle and in-card detail panel containing description, due date, assignees, attachments, and linked todo info (visible only when expanded).
  - [x] 🟩 Ensure priority colors follow the Clean Industrial palette and update live when edits occur.

- [x] 🟩 **Step 4: Implement quick-edit dialog workflow**
  - [x] 🟩 Build a modal dialog triggered from each card that exposes editable fields with explicit Save/Cancel actions.
  - [x] 🟩 Connect form inputs to the new mutation, handle loading/error states, and optimistically refresh the local task cache.

- [x] 🟩 **Step 5: Validate UX & interactions**
  - [x] 🟩 Verify drag-and-drop remains smooth with expanded cards and dialogs (prevent sensor conflicts).
  - [x] 🟩 Smoke-test priority updates, detail visibility, and quick edits across all columns in light/dark modes.
