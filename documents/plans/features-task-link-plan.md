# Feature-Linked Tasks Implementation Plan

**Overall Progress:** `60%`

## Summary

Enable coding projects to define structured Features with acceptance detail and checklist items, then surface that context directly on Kanban tasks. The work spans schema updates (project typing, feature/checklist tables, task-link constraints), Convex mutations and hooks to keep task/checklist state synchronized, and a focused UI layer: inline feature management on the project detail page, drag/drop linking between boards, and feature badges plus slide-out details on task cards. Non-coding projects remain unchanged.

## Tasks

- [x] 🟩 **Step 1: Extend data model for project typing and features**
  - [x] 🟩 Add `type` field on `projects` (e.g., `"coding" | "general"`) with indexes and migration script/seed handling
  - [x] 🟩 Introduce `projectFeatures` and `featureChecklistItems` tables with required fields (`title`, `description`, `whatDoneLooksLike`, ordered checklist, optional task reference)
  - [x] 🟩 Update `tasks` documents to store optional `featureId` and `featureChecklistItemId` while enforcing one-task-per-checklist linkage in Convex validators

- [x] 🟩 **Step 2: Build Convex feature + linking API surface**
  - [x] 🟩 Implement queries/mutations to create, update, reorder, and delete features/checklist items with strict user/project checks
  - [x] 🟩 Add mutations to link/unlink tasks to features or specific checklist items, ensuring one-to-one task linkage and multi-task support per checklist entry
  - [x] 🟩 Enhance task status mutations (`move`, `toggle`, `updateStatus`, `deleteTask`) to auto-check/uncheck checklist items when linked tasks enter/leave `done`

- [x] 🟩 **Step 3: Add project-level feature management UI**
  - [x] 🟩 Detect project type in `app/projects/[id]/page.tsx` and render an inline feature management panel only for coding projects
  - [x] 🟩 Implement dialog/slide-out for creating/editing features and their checklist items, mirroring Convex API contracts
  - [x] 🟩 Provide drag/drop or ordering controls to manage checklist sequences and persist via mutations

- [ ] 🟥 **Step 4: Integrate task linking + feature context in Kanban UI**
  - [ ] 🟥 Add a feature panel adjacent to the Kanban board that lists features/checklists and accepts drag/drop from task cards for linking
  - [ ] 🟥 Update each task card to display a colored feature badge beside existing priority/due indicators; clicking opens the feature slide-out
  - [ ] 🟥 Support manual relinking/unlinking of tasks (including from the task quick edit dialog) and ensure deleted/unlinked tasks clear checklist references

- [ ] 🟥 **Step 5: Polish interactions and regression coverage**
  - [ ] 🟥 Ensure non-coding projects hide all feature UI surfaces while still honoring backend constraints
  - [ ] 🟥 Add optimistic updates or loading states for linking/checking flows to keep drag/drop snappy
  - [ ] 🟥 Document new behaviors plus test plan (manual + automated) covering checklist sync, badge rendering, and multi-task checklist scenarios
