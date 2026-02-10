# AGENTS.md

This file provides guidance when working with code in this repository.

## Project Overview

**Personal OS** is a unified productivity dashboard designed for developers and lifelong learners. It consolidates project management, task tracking, bug reporting, AI prompt storage, and language study into a single "Clean Industrial" interface.

**Primary Goal**: Provide a high-density, keyboard-accessible "cockpit" for managing daily work and learning.
**Target Users**: Developers, engineers, and self-learners who value speed and data ownership.

## Development Commands

```bash
# Development (Monorepo)
turbo run dev                   # Run dev across apps/packages
turbo run dev --filter=web      # Next.js app only
turbo run dev --filter=mobile   # Expo app only
turbo run dev --filter=backend  # Convex backend only

# Build & Deploy
turbo run build                 # Build all packages/apps
turbo run build --filter=web    # Build web only
turbo run build --filter=mobile # Build mobile only

# Code Quality
turbo run lint                  # Lint across packages/apps
turbo run typecheck             # TypeScript type checking

# Testing
turbo run test                  # Run all tests (Vitest)
turbo run test:watch            # Run tests in watch mode
```

## Architecture & Structure

### Vertical Slice Architecture (VSA)
This project follows VSA principles where code is organized by feature/route rather than technical layers:

- **Feature-First**: Each route (`apps/web/app/projects`, `apps/web/app/study`, `apps/mobile/app/projects`) is a self-contained slice.
- **Colocation**: Use underscore-prefixed folders (`_components`) for route-specific UI.
- **Backend Cohesion**: Convex functions (`apps/backend/convex/projects.ts`, `apps/backend/convex/study.ts`) mirror the frontend slices.

### Project Structure (Monorepo + VSA)
```
root/
├── apps/
│   ├── web/                       # Next.js App Router (VSA per route)
│   │   ├── app/
│   │   │   ├── page.tsx          # Dashboard (Cockpit)
│   │   │   ├── projects/         # Project Hub & Kanban
│   │   │   ├── study/            # Study Center (Vocab & Flashcards)
│   │   │   ├── prompts/          # Prompt Library
│   │   │   ├── bugs/             # Bug Tracker
│   │   │   ├── layout.tsx        # Root layout (Sidebar + Command Palette)
│   │   │   └── globals.css       # Tailwind v4 + Custom Fonts
│   │   └── components/           # ONLY truly shared web UI components
│   │       ├── ui/               # shadcn/ui components
│   │       ├── Sidebar.tsx       # Global navigation
│   │       └── CommandPalette.tsx# Global actions (Cmd+K)
│   │
│   ├── mobile/                    # Expo React Native app (VSA per screen)
│   │   └── app/                   # Mirrors web slices where possible
│   │       ├── home/
│   │       ├── projects/
│   │       ├── study/
│   │       ├── prompts/
│   │       └── bugs/
│   │
│   └── backend/                   # Convex backend (shared by web + mobile)
│       └── convex/
│           ├── schema.ts          # Database schema (strictly typed)
│           ├── projects.ts        # Project/Task logic
│           ├── study.ts           # Study logic
│           └── auth.config.ts     # WorkOS configuration
│
├── packages/
│   ├── shared/                    # Shared types, validators, helpers
│   ├── ui/                        # Optional cross-platform UI (if needed)
│   └── config/                    # Shared eslint/tsconfig/prettier
│
├── documents/                     # Project documentation & specs
└── turbo.json                      # Turborepo configuration
```

### Monorepo Principles
- **Apps vs Packages**: `apps/` are deployables; `packages/` are shared libraries/configs.
- **VSA per App**: Each app keeps feature-first slices; no shared feature logic inside an app.
- **Shared Code**: Move cross-cutting logic to `packages/shared` (types, validators, API helpers).
- **Boundaries**: Apps may depend on packages; packages should not depend on apps.
- **Workspace Protocol**: Use `workspace:*` for internal deps to keep versions aligned.

### Key Technologies
- **Next.js 15**: App Router with Server Components.
- **Convex**: Real-time backend-as-a-service (Database + Functions).
- **WorkOS**: Authentication provider (via `@workos-inc/authkit-nextjs`).
- **Tailwind CSS v4**: Utility-first styling with Slate color palette.
- **shadcn/ui**: Reusable UI primitives.
- **Lucide React**: Iconography.
- **Noto Sans Arabic**: Typography for study content.

## Site Architecture (5 Core Modules)

### Information Architecture
1. **Dashboard** (`/`) - "The Cockpit": Today's Focus, Quick Stats, Recent Vocab.
2. **Projects** (`/projects`) - Grid view of initiatives + Kanban board details.
3. **Study** (`/study`) - Vocabulary list management + Flashcard review mode.
4. **Prompts** (`/prompts`) - Library of reusable AI prompts with copy-to-clipboard.
5. **Bugs** (`/bugs`) - Lightweight issue tracker with severity levels.

### Key Interactions
- **Command Palette**: Global `Cmd+K` to navigate or create items instantly.
- **Kanban Board**: Drag-and-drop style task management (status toggling).
- **Flashcards**: Interactive flip-card interface for reviewing vocabulary.

### Design System
- **Theme**: "Clean Industrial" (Slate 50-900).
- **Mode**: Dark Mode First (optimized for coding environments).
- **Typography**: Inter (UI), JetBrains Mono (Code), Noto Sans Arabic (Content).

## Technical Implementation Requirements

### Convex Backend Pattern
- **Data Isolation**: EVERY query and mutation must check `ctx.auth.getUserIdentity()` and filter by `userId`.
- **Real-time**: Use `useQuery` for reactive UI updates.
- **Mutations**: Handle data changes (create, update, delete) via `useMutation`.

### Authentication
- Managed by WorkOS AuthKit.
- `ConvexClientProvider` wraps the app to sync auth state with Convex.
- Middleware protects routes from unauthenticated access.

### Internationalization (Study Module)
- Arabic text must be rendered with `dir="rtl"` and `font-arabic` class.
- Vocabulary entries require `word` (Arabic), `translation`, and `exampleSentence`.

## Development Guidelines

### When Creating New Features
1. **Schema First**: Define the table in `apps/backend/convex/schema.ts` with `userId` index.
2. **Backend Logic**: Implement CRUD in `apps/backend/convex/[feature].ts` with strict auth checks.
3. **Frontend Slice**: Create `apps/web/app/[feature]/page.tsx` and colocated components.
4. **Global Access**: Register the new route in `apps/web/components/Sidebar.tsx` and `apps/web/components/CommandPalette.tsx`.

### Convex Mutation Pattern
```typescript
// apps/backend/convex/example.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    await ctx.db.insert("tableName", {
      title: args.title,
      userId: user.subject, // CRITICAL: Always bind to user
      // ...
    });
  },
});
```

### Component Development
- Prefer **shadcn/ui** components for consistency.
- Use `lucide-react` for all icons.
- Ensure **Dark Mode** compatibility (use `dark:` variants).
- Optimize for keyboard navigation (tab index, focus states).

## Testing

### Testing Stack
- **Vitest**: Fast unit testing framework with TypeScript support.
- **convex-test**: Integration testing for Convex queries and mutations.
- **@edge-runtime/vm**: Provides edge runtime environment for Convex tests.

### Test File Structure (VSA-aligned)
Tests are colocated with their source files following the VSA pattern:
```
apps/backend/convex/
├── test.setup.ts           # Shared test setup (modules glob)
├── projects.ts
├── projects.test.ts        # Integration tests for projects
├── study/
│   ├── _helpers.ts
│   ├── _helpers.test.ts    # Unit tests for pure functions
│   ├── collections.ts
│   ├── collections.test.ts # Integration tests for collections
│   ├── words.ts
│   └── words.test.ts       # Integration tests for words
apps/web/lib/
├── arabic.ts
└── arabic.test.ts          # Unit tests for Arabic text utilities
```

### Convex Integration Test Pattern
```typescript
// apps/backend/convex/example.test.ts
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("example", () => {
  it("returns empty array when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.example.list, {});
    expect(result).toEqual([]);
  });

  it("creates item for authenticated user", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    const id = await asUser.mutation(api.example.create, { title: "Test" });
    const items = await asUser.query(api.example.list, {});

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Test");
  });
});
```

### Key Testing Patterns
- **Auth Testing**: Use `t.withIdentity({ subject: "user_id" })` to simulate authenticated users.
- **User Isolation**: Always test that users cannot access each other's data.
- **Validation Testing**: Test error cases with `.rejects.toThrow()`.
- **Time-Dependent Tests**: Use `vi.useFakeTimers()` and `vi.setSystemTime()` for SRS/review logic.

This codebase prioritizes speed, data ownership, and a distraction-free environment for personal productivity.
