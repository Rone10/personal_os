# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Personal OS** is a unified productivity dashboard designed for developers and lifelong learners. It consolidates project management, task tracking, bug reporting, AI prompt storage, and language study into a single "Clean Industrial" interface.

**Primary Goal**: Provide a high-density, keyboard-accessible "cockpit" for managing daily work and learning.
**Target Users**: Developers, engineers, and self-learners who value speed and data ownership.

## Development Commands

```bash
# Development
npm run dev             # Starts both Next.js frontend and Convex backend concurrently
npx convex dev          # Run Convex backend separately (if needed)
next dev                # Run Next.js frontend separately (if needed)

# Build & Deploy
pnpm build              # Build for production
pnpm start              # Start production server

# Code Quality
pnpm lint               # Run ESLint
tsc --noEmit            # Run TypeScript type checking
```

## Architecture & Structure

### Vertical Slice Architecture (VSA)
This project follows VSA principles where code is organized by feature/route rather than technical layers:

- **Feature-First**: Each route (`app/projects`, `app/study`) is a self-contained slice.
- **Colocation**: Use underscore-prefixed folders (`_components`) for route-specific UI.
- **Backend Cohesion**: Convex functions (`convex/projects.ts`, `convex/study.ts`) mirror the frontend slices.

### Project Structure
```
root/
├── app/                    # Next.js App Router (VSA approach)
│   ├── page.tsx           # Dashboard (Cockpit)
│   ├── projects/          # Project Hub & Kanban
│   ├── study/             # Study Center (Vocab & Flashcards)
│   ├── prompts/           # Prompt Library
│   ├── bugs/              # Bug Tracker
│   ├── layout.tsx         # Root layout (Sidebar + Command Palette)
│   └── globals.css        # Tailwind v4 + Custom Fonts
│
├── convex/                # Backend & Database
│   ├── schema.ts          # Database schema (Strictly typed)
│   ├── projects.ts        # Project/Task logic
│   ├── study.ts           # Study logic
│   └── auth.config.ts     # WorkOS configuration
│
├── components/            # ONLY truly shared UI components
│   ├── ui/                # shadcn/ui components
│   ├── Sidebar.tsx        # Global navigation
│   └── CommandPalette.tsx # Global actions (Cmd+K)
│
└── documents/             # Project documentation & specs
```

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
1. **Schema First**: Define the table in `convex/schema.ts` with `userId` index.
2. **Backend Logic**: Implement CRUD in `convex/[feature].ts` with strict auth checks.
3. **Frontend Slice**: Create `app/[feature]/page.tsx` and colocated components.
4. **Global Access**: Register the new route in `Sidebar.tsx` and `CommandPalette.tsx`.

### Convex Mutation Pattern
```typescript
// convex/example.ts
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

This codebase prioritizes speed, data ownership, and a distraction-free environment for personal productivity.
