# Arabic Knowledge Vault v1 Implementation Plan

## Objective
Ship an additive Vault module inside Study that provides:
- table-first capture and retrieval for Arabic word/phrase entries
- controlled taxonomy (`Subject -> Category -> Topic`)
- tags + references (internal and external)

## Backend Tasks
1. Schema updates in `apps/backend/convex/schema.ts`
   - add `vaultSubjects`, `vaultCategories`, `vaultTopics`, `vaultEntries`, `vaultEntryReferences`
   - add indexes for user-scoped filtering and ordering
   - extend `entityTags.entityType` with `vaultEntry`
2. Implement `apps/backend/convex/study/vault.ts`
   - taxonomy CRUD
   - entry CRUD/filtering
   - reference CRUD + reorder
   - auth, ownership, and taxonomy/source validation
3. Integrate with existing systems
   - `study/tags.ts` unions include `vaultEntry`
   - `study/search.ts` returns `vaultEntries` and includes vault quick search/recent items

## Frontend Tasks
1. Add new Study view/type wiring
   - `StudyPageClient.tsx`: `view=vault`, `entityType=vaultEntry`
   - `MainContent.tsx`: vault list/detail rendering
   - `NavigationTree.tsx`: vault navigation section
2. Build vault UI components
   - `lists/VaultEntriesTable.tsx`
   - `details/VaultEntryDetail.tsx`
   - `dialogs/VaultEntryFormDialog.tsx`
   - `dialogs/VaultTaxonomyDialog.tsx`
   - `dialogs/VaultReferenceFormDialog.tsx`
3. Search + tag UI integration
   - include vault entries in client search model
   - show vault results in search popover and tag detail groupings

## Test Plan
1. Add `apps/backend/convex/study/vault.test.ts`:
   - unauth query behavior
   - create/list with user isolation
   - taxonomy chain validation
   - source book/chapter validation
   - tag filtering
   - reference validation + reorder behavior
2. Run backend tests and type checks after Convex codegen.

## Rollout
1. Non-breaking additive release:
   - existing words/books/courses screens remain unchanged
   - new vault view available via `/study?view=vault`
2. Manual onboarding only:
   - no auto migration from chapter notes in v1

## Follow-up Candidates
1. Chapter import assistant for semi-automated capture.
2. Vault-specific keyboard shortcuts for faster data entry.
3. Saved filter presets for recurring study contexts.
