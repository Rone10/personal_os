# Ideas Vault Design (Approved)

**Date:** 2026-02-26  
**Status:** Approved  
**Scope:** Ultra-minimal, low-brain-fog ideas capture with project visibility

## 1) Product Intent
Build a lightweight Ideas Vault that helps capture current and future ideas without requiring habits, rituals, or complex workflows.

This feature is explicitly designed to:
- preserve ideas quickly,
- keep context connected (projects/prompts/references),
- provide execution visibility via a simple project status board.

## 2) Design Principles
- **Zero ceremony:** no weekly ritual required.
- **Capture-first:** minimal required fields.
- **Optional structure:** enrich only when useful.
- **Execution visibility:** simple kanban board for project status.
- **No cognitive overload:** avoid graph complexity, heavy scoring, and automation in v1.

## 3) Core UX

### 3.1 Ideas Vault (Primary)
Single destination to save and revisit ideas.

#### Required fields
- `title`
- `problemOneLiner`
- `status`

#### Optional fields
- `referenceUrl`
- `notes`

#### Statuses (exactly 3)
- `captured`
- `worth_exploring`
- `parked`

### 3.2 Lightweight “Smart” Linking
When viewing an idea, show related links if present:
- linked projects,
- linked prompts,
- linked ideas,
- reference links.

No advanced recommendation engine required for v1.

### 3.3 Project Kanban Visibility
Provide a simple project status board with minimal columns:
- `Idea`
- `Active`
- `Done/Archived`

Each project card should display:
- project name,
- current status,
- count of linked ideas.

From idea detail, support two direct actions:
- link to existing project,
- create project from idea.

## 4) Information Architecture
- New module: `Ideas`.
- Primary views:
  1. Ideas list (quick scan + status filters)
  2. Idea detail (fields + linked entities)
  3. Project kanban (status-centric execution view)

## 5) Data Model (Conceptual)

### Idea entity
- `userId`
- `title`
- `problemOneLiner`
- `status` (`captured` | `worth_exploring` | `parked`)
- `referenceUrl?`
- `notes?`
- `createdAt`
- `updatedAt`

### Idea links (minimal)
- idea ↔ project (many-to-many)
- idea ↔ prompt (many-to-many)
- idea ↔ idea (self-relation, optional)

## 6) Data Flow
1. User captures idea with required fields.
2. Idea appears immediately in Ideas list.
3. User optionally links idea to project/prompt/idea.
4. If promoted toward execution, user links to existing project or creates a project from idea.
5. Project board reflects status and linked-ideas counts.

## 7) Error Handling & Guardrails
- Missing required fields: block save and show inline validation.
- Invalid URL in `referenceUrl`: non-blocking warning or format validation.
- Linking failures: preserve idea data; show retry option.
- Unauthorized access: return empty lists for queries and prevent mutation.
- User isolation: all queries/mutations scoped to `userId`.

## 8) Testing Strategy (Right-sized)
- Unit tests:
  - status transition validity,
  - required field validation,
  - link create/remove behavior.
- Integration tests (backend):
  - user data isolation,
  - create/list/update idea,
  - link idea↔project and idea↔prompt.
- UI tests (critical flows):
  - quick capture,
  - open idea detail + link entity,
  - create project from idea,
  - project kanban reflects status.

## 9) Non-Goals (v1)
- No weekly review workflow.
- No complex scoring model.
- No graph visualization.
- No automation rules.
- No AI-generated prioritization.

## 10) Success Criteria
- User can capture an idea in under 20 seconds.
- User can link an idea to a project or prompt in one short flow.
- User can view project execution state in kanban without leaving the module context.
- User can return after long gaps and still understand idea inventory quickly.
