# Arabic Knowledge Vault v1 Design

**Date:** 2026-02-26  
**Status:** Approved  
**Scope:** Table-first Arabic vault for word/phrase entries inside Study.

## Product Intent
Create a fast personal Arabic knowledge vault where each row is a word or phrase.  
Rows must be organized by a controlled taxonomy (`Subject -> Category -> Topic`) and filtered quickly in a dense table view.

## Core Decisions
- Vault row scope: `word | phrase` only.
- Taxonomy model: controlled hierarchy, global per user.
- Placement: new `Vault` view inside `/study`.
- Tags: reuse existing Study tags.
- References: support both internal entity links and external URLs.
- Migration: manual quick-capture only in v1.

## Architecture
- Add dedicated backend slice: `apps/backend/convex/study/vault.ts`.
- Add new schema tables:
  - `vaultSubjects`
  - `vaultCategories`
  - `vaultTopics`
  - `vaultEntries`
  - `vaultEntryReferences`
- Extend `entityTags.entityType` with `vaultEntry`.
- Add new Study view/route state:
  - list view: `/study?view=vault`
  - detail view: `/study?view=vault&type=vaultEntry&id=<entryId>`

## UX Model
- Table columns:
  - Arabic Text
  - Type
  - Subject
  - Category
  - Topic
  - Tags
  - Source
  - References
  - Updated
- Filters:
  - search text
  - type
  - subject/category/topic
  - tag
  - book/chapter
- Quick actions:
  - quick add entry
  - taxonomy manager
  - row click -> detail editor

## Validation Rules
- Category must belong to selected subject.
- Topic must belong to selected category/subject.
- If chapter is selected, it must belong to selected book.
- Internal reference requires `targetType + targetId`.
- External reference requires valid URL and label.

## Non-goals (v1)
- Auto-import from chapter content.
- AI extraction/suggestion.
- Graph visualization.
