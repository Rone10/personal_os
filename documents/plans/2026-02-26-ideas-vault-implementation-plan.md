# Ideas Vault (Minimal) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an ultra-minimal Ideas Vault for fast capture and lightweight linking to projects/prompts/ideas, plus project kanban visibility by status.

**Architecture:** Reuse existing monorepo/VSA structure. Add a new backend slice for ideas data and links in Convex, and a new web slice under the App Router for list/detail/create flows. Keep intelligence intentionally shallow: just explicit links and simple related-entity display.

**Tech Stack:** TypeScript, Convex (queries/mutations/schema), Next.js App Router, React, shadcn/ui, Tailwind, Vitest/convex-test.

---

### Task 1: Add Ideas schema (minimal fields only)

**Files:**
- Modify: `apps/backend/convex/schema.ts`
- Test: `apps/backend/convex/ideas.test.ts`

**Step 1: Write the failing schema test scaffold**
Create `apps/backend/convex/ideas.test.ts` with a basic test expecting ideas list query to return empty array when unauthenticated.

**Step 2: Run test to verify it fails**
Run: `pnpm --filter backend test apps/backend/convex/ideas.test.ts`
Expected: FAIL because `ideas` table/query does not exist yet.

**Step 3: Write minimal schema updates**
Add tables:
- `ideas` with fields: `userId`, `title`, `problemOneLiner`, `status`, `referenceUrl?`, `notes?`, `createdAt`, `updatedAt`
- `ideaLinks` with fields: `userId`, `fromIdeaId`, `toIdeaId`, `createdAt`
- `ideaProjectLinks` with fields: `userId`, `ideaId`, `projectId`, `createdAt`
- `ideaPromptLinks` with fields: `userId`, `ideaId`, `promptId`, `createdAt`

Add practical indexes by user and relation fields.

**Step 4: Run backend type generation/dev check**
Run: `pnpm --filter backend dev --once` (or project-equivalent schema/type generation command)
Expected: PASS with updated generated types.

**Step 5: Commit**
```bash
git add apps/backend/convex/schema.ts apps/backend/convex/ideas.test.ts
git commit -m "feat(ideas): add minimal ideas and link tables"
```

---

### Task 2: Add Ideas backend functions (CRUD + links)

**Files:**
- Create: `apps/backend/convex/ideas.ts`
- Modify: `apps/backend/convex/test.setup.ts`
- Test: `apps/backend/convex/ideas.test.ts`

**Step 1: Write failing backend behavior tests**
Add tests for:
- unauthenticated list returns `[]`
- authenticated create returns id and persists
- status update works (`captured` | `worth_exploring` | `parked`)
- link/unlink to project and prompt
- user isolation between two identities

**Step 2: Run tests to verify failure**
Run: `pnpm --filter backend test apps/backend/convex/ideas.test.ts`
Expected: FAIL due missing functions.

**Step 3: Implement minimal functions**
In `ideas.ts`, implement:
- queries: `list`, `getById`, `getLinkedProjects`, `getLinkedPrompts`, `getLinkedIdeas`
- mutations: `create`, `update`, `setStatus`, `linkProject`, `unlinkProject`, `linkPrompt`, `unlinkPrompt`, `linkIdea`, `unlinkIdea`, `createProjectFromIdea`

Requirements:
- enforce `ctx.auth.getUserIdentity()`
- enforce `userId` ownership checks on all entities
- return empty array on unauthenticated query paths
- throw on unauthorized mutation paths

**Step 4: Run tests and make green**
Run: `pnpm --filter backend test apps/backend/convex/ideas.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add apps/backend/convex/ideas.ts apps/backend/convex/ideas.test.ts apps/backend/convex/test.setup.ts
git commit -m "feat(ideas): implement minimal ideas CRUD and linking mutations"
```

---

### Task 3: Add Ideas route (list + create fast capture)

**Files:**
- Create: `apps/web/app/ideas/page.tsx`
- Create: `apps/web/app/ideas/_components/IdeaQuickCreate.tsx`
- Create: `apps/web/app/ideas/_components/IdeasList.tsx`
- Test: `apps/web/app/ideas/page.test.tsx` (if route tests are used in web app)

**Step 1: Write failing UI behavior tests (or test plan if route tests absent)**
Cover:
- renders empty state
- quick create requires title + one-liner + default status
- created item appears in list reactively

**Step 2: Run tests to verify failure**
Run: `pnpm --filter web test`
Expected: FAIL (or note no route test harness if absent; document manual checks).

**Step 3: Implement minimal UI**
Build page with:
- quick-create form with required fields only
- list grouped/filterable by 3 statuses
- no scoring, no weekly ritual UI, no graph

**Step 4: Verify behavior**
Run: `pnpm --filter web dev`
Manual verify:
- create idea in <20s
- status changes persist
- optional link/notes render safely

**Step 5: Commit**
```bash
git add apps/web/app/ideas/page.tsx apps/web/app/ideas/_components/IdeaQuickCreate.tsx apps/web/app/ideas/_components/IdeasList.tsx
git commit -m "feat(web): add minimal ideas vault list and quick capture"
```

---

### Task 4: Add idea detail with lightweight linking

**Files:**
- Create: `apps/web/app/ideas/[id]/page.tsx`
- Create: `apps/web/app/ideas/_components/IdeaLinksPanel.tsx`
- Modify: `apps/web/components/DependencyPicker.tsx` (optional reuse) or create small local picker components

**Step 1: Write failing tests/manual checks**
Validate:
- linked projects list appears
- linked prompts list appears
- linked ideas list appears
- link/unlink actions update UI reactively

**Step 2: Run test/check to confirm missing behavior**
Run targeted web tests or use manual QA checklist in dev mode.
Expected: current behavior missing.

**Step 3: Implement minimal linking UI**
Add only:
- link existing project
- link existing prompt
- link existing idea
- create project from idea action

No recommendation algorithm beyond displaying existing links.

**Step 4: Verify**
Manual QA in web dev:
- link/unlink works
- ownership boundaries respected via backend errors

**Step 5: Commit**
```bash
git add apps/web/app/ideas/[id]/page.tsx apps/web/app/ideas/_components/IdeaLinksPanel.tsx
git commit -m "feat(web): add idea detail and lightweight entity linking"
```

---

### Task 5: Wire Ideas into navigation and command palette

**Files:**
- Modify: `apps/web/components/Sidebar.tsx`
- Modify: `apps/web/components/CommandPalette.tsx`

**Step 1: Write failing expectation**
Expectation:
- Sidebar includes Ideas route
- Command palette includes “Go to Ideas” and “Create Idea” action

**Step 2: Verify missing behavior**
Run web app and confirm route/action absent.

**Step 3: Implement minimal navigation updates**
Add route registration and command actions; preserve existing style and icon conventions.

**Step 4: Verify**
Manual check:
- Ideas visible in sidebar
- Cmd+K can navigate/open quick-create intent

**Step 5: Commit**
```bash
git add apps/web/components/Sidebar.tsx apps/web/components/CommandPalette.tsx
git commit -m "feat(web): add ideas navigation and command palette actions"
```

---

### Task 6: Add project kanban linked-ideas count

**Files:**
- Modify: existing project board/card components in web slice (likely `apps/web/components/KanbanBoard.tsx` and/or project-specific components)
- Modify: `apps/backend/convex/projects.ts` (or ideas query join helper) to expose linked-ideas count per project card
- Test: add/extend backend tests for count projection

**Step 1: Write failing tests/checks**
Expectation:
- each project card in status board displays linked ideas count

**Step 2: Verify current behavior fails**
Run current UI and confirm count not shown.

**Step 3: Implement minimal count plumbing**
Add a count field in project query payload and render it on card subtitle/badge.

**Step 4: Verify**
Manual verify board columns still: Idea / Active / Done(Archived) and count updates after linking.

**Step 5: Commit**
```bash
git add apps/backend/convex/projects.ts apps/web/components/KanbanBoard.tsx
git commit -m "feat(projects): show linked ideas count on kanban cards"
```

---

### Task 7: Documentation + quality gate

**Files:**
- Modify: `README.md` (feature mention)
- Modify: relevant docs index under `documents/` if used

**Step 1: Add concise usage notes**
Document:
- idea statuses,
- quick capture fields,
- linking behavior,
- create project from idea.

**Step 2: Run lint/typecheck/tests**
Run:
- `pnpm turbo run lint`
- `pnpm turbo run typecheck`
- `pnpm turbo run test --filter=backend`

Expected: PASS for touched scopes; if unrelated failures exist, document them.

**Step 3: Final commit**
```bash
git add README.md documents/
git commit -m "docs: add ideas vault usage and project linking notes"
```

---

## Out-of-Scope for this plan
- Graph visualization
- AI scoring/prioritization
- Weekly ritual/review system
- Automation rules

## Acceptance Checklist
- Idea capture works with required fields only.
- Exactly 3 statuses exist for ideas.
- Idea detail can link/unlink to projects/prompts/ideas.
- One-click create project from idea works.
- Project board shows status and linked ideas count.
- All operations respect user isolation/auth checks.
