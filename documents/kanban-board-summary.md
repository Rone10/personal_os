# Kanban Board Implementation Summary

This document explains how the current Kanban board (see `components/KanbanBoard.tsx`) is wired end-to-end, including Convex data contracts, React/Next.js integration, drag-and-drop handling, visual decisions, and the recent fix that keeps cards from hopping columns unless explicitly dragged. Treat this as the canonical reference when reproducing or extending the board elsewhere in this repo or other projects.

---

## 1. Feature Goals
- Provide a high-density overview of a single project's work across `todo`, `in_progress`, and `done` states.
- Support inline task creation, priority indicators, due dates, and optimistic drag-and-drop reordering.
- Keep the UI real-time via Convex `useQuery` subscriptions so other clients see changes instantly.
- Maintain strict per-user data isolation (WorkOS auth + Convex user IDs).

## 2. Data Model (Convex Schema)
`convex/schema.ts` defines the `tasks` table:
- `userId` (string): owner scoping, indexed for auth filters.
- `title` (string): task label.
- `projectId` (Id<"projects">): foreign key.
- `status` (`todo|in_progress|done`): Kanban column.
- `priority` (number 1-3) and optional `dueDate`, `tags`.
- `order` (number): dense ordering per column; recalculated after every drag or auto-advance.
- Index `by_user_project` enforces fast lookups scoped by user and project (and filters by status when needed).

## 3. Backend Functions (`convex/tasks.ts`)
- `getByProject`: query that authenticates user, verifies project ownership, and returns all tasks for the project. Since Convex queries are live, the frontend stays in sync automatically.
- `create`: mutation requiring `title`, `projectId`, `priority`, optional metadata. It validates ownership, inserts a `status: "todo"` task, and seeds `order` with `Date.now()` so freshly created cards appear at the end of the To Do column.
- `move`: mutation invoked for both intra-column reorders and cross-column moves. It enforces auth, then patches `status` + `order` atomically to maintain consistency across clients.
- Other helpers (`getToday`, `toggle`, `updateStatus`) exist but the Kanban currently uses only `getByProject`, `create`, and `move`.

## 4. Frontend Composition
The board is a client component that imports Convex React hooks and `@dnd-kit` utilities.

### Key UI building blocks
- **`TaskCard`**: Stateless presentation component rendering title, status icon, priority badge, and due date. Receives optional `onAdvance` handler.
- **`SortableTask`**: Wraps `TaskCard` with `useSortable` to hook into drag sensors. Handles transform styles and hides the original card while dragging.
- **`DroppableColumn`**: Column wrapper that registers a droppable area, shows column metadata, and renders child tasks. Uses Tailwind for layout.

### Main board state
- `tasksQuery`: live data via `useQuery(api.tasks.getByProject, { projectId })`.
- `createTask`, `moveTask`: Convex mutations.
- `localTasks`: local copy of tasks for optimistic updates and to avoid fighting with DnD state. Synced from `tasksQuery` whenever the server result changes and no card is currently being dragged.
- `columns`: memoized map splitting `localTasks` by status for render.
- `newTaskTitle`: controlled input for inline creation (default priority 1).

## 5. Drag-and-Drop Flow
1. **Sensors**: Uses a pointer sensor with a small distance threshold so clicking buttons does not trigger drags.
2. **`handleDragStart`**: Records `activeId` so we can look up the dragged task and lock local syncing while dragging.
3. **`handleDragOver`**: Now intentionally empty to prevent mid-drag mutations that used to move uninvolved cards.
4. **`handleDragEnd`** (core logic):
   - Determines the drop target: either a column (using the `COLUMN_IDS` constant) or another task card.
   - Sets `newStatus` based on column or the target task's status.
   - Calculates a new `order` value:
     - Dropping onto column space: append to end by taking max order of that column + 1000.
     - Dropping onto a card: use `arrayMove` to reorder locally, then inspect neighbors within that status list to pick an order between them (`prev + next)/2` fallback). Edge cases (first/last only neighbor) subtract or add 1000.
   - Updates `localTasks` immediately (so the UI reflects the move) while preserving other cards' status/order.
   - Calls `moveTask({ id, status: newStatus, newOrder })` to persist.
5. **`DragOverlay`** displays a lifted version of the card to keep layout stable.

## 6. Auto-Advance Button Logic
`TaskCard` includes an icon button that cycles a task through `todo → in_progress → done → todo`. When clicked, `handleAdvance`:
- Predicts the next status, finds the max `order` within that destination column, and sets the new task order to `max + 1000` (append behavior).
- Immediately mutates `localTasks` for optimistic UX.
- Calls the `moveTask` mutation to persist.

## 7. Styling & Accessibility Considerations
- Tailwind classes provide per-status color coding (emerald for done, blue for in-progress).
- Columns use `overflow-y-auto` with padding to support long lists.
- `Badge` variants communicate priority; due dates surface as muted timestamps.
- `GripVertical` icon appears on hover to hint at drag affordance; `cursor-grab`/`cursor-grabbing` states communicate interactivity.
- Inputs and buttons stay keyboard-accessible; DnD requires pointer for now, but the board degrades gracefully (status button still cycles state).

## 8. Recent Fix (November 2025)
**Issue**: While dragging a card, hovering over another column or card triggered `handleDragOver` to immediately mutate `localTasks` by changing the active task's status. Because Convex data is live, other cards occasionally re-sorted or even jumped columns without being dropped. This felt glitchy and risked incorrect state if the drag was canceled.

**Resolution**:
- Replaced the old `handleDragOver` body with a no-op (lint-clean by removing the unused `DragOverEvent` import) so no state changes occur mid-drag.
- Enhanced `handleDragEnd` to do all reconciliation:
  - Determine final column vs. task target using a shared `COLUMN_IDS` constant.
  - Reorder `localTasks` and compute column-relative order numbers before syncing to the server.
  - Ensure column drops append cleanly, while card drops insert between neighbors without disturbing other columns.
- Side effect: Observers never see cards "teleport" during drag; only the dropped card moves once the gesture completes, mirroring expected Kanban behavior.

## 9. Reuse / Extension Checklist
1. **Backend**: Reuse `tasks` schema fields and indexes. Any new board must validate ownership, use `order` numbers, and centralize mutations in a `move` function.
2. **Data Fetching**: Prefer `useQuery` for live updates. Keep a local mirror to manage drag states without flicker.
3. **State Sync Guard**: Only resync `localTasks` when not dragging (`activeId === null`).
4. **Ordering Strategy**: Stick to sparse numeric ordering (±1000) to minimize rebalancing; consider periodic normalization if many moves occur.
5. **Drag Handling**: Use `@dnd-kit` with sensors, `SortableContext`, and explicit `DragOverlay`. Keep `handleDragOver` side-effect free unless you have strong reasons to optimistically preview moves.
6. **Optimistic Mutations**: Update local state first for snappy UX, then fire the Convex mutation. Always ensure fallback states (e.g., `newOrder || Date.now()`).
7. **Auth & Isolation**: Every query/mutation must gate on `ctx.auth.getUserIdentity()` and verify project ownership before reading/writing tasks.
8. **UI Consistency**: Follow the "Clean Industrial" aesthetic—muted columns, badges, lucide icons, shadcn inputs/buttons.

## 10. Future Enhancements
- Keyboard reordering or quick status shortcuts for accessibility.
- Swimlane filtering (e.g., by tag or priority) by extending the columns memoization.
- Server-side order normalization job to keep numbers bounded.
- Batched history logging when tasks move across columns for analytics.

Refer back to this guide before replicating the Kanban experience to ensure functional parity and consistent UX across the Personal OS.
