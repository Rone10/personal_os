# Personal OS Implementation Summary

**Date:** November 21, 2025
**Status:** Complete (v1.0)

## Overview
This document summarizes the technical implementation of the "Personal OS" system. The application was built using Next.js 15 (App Router), Convex (Backend-as-a-Service), and WorkOS (Authentication). The system provides a unified dashboard for managing projects, tasks, bugs, AI prompts, and language study.

## 1. Architecture & Tech Stack

*   **Framework:** Next.js 15 (App Router)
*   **Backend/Database:** Convex (Real-time, Reactive)
*   **Authentication:** WorkOS (via `@workos-inc/authkit-nextjs`)
*   **Styling:** Tailwind CSS v4 + shadcn/ui
*   **Icons:** Lucide React
*   **Typography:** Inter (Default), Noto Sans Arabic (Study content)

## 2. Database Schema (Convex)

The database schema (`convex/schema.ts`) was designed with multi-tenancy at its core. Every table includes a `userId` field to ensure strict data isolation between users.

### Tables
1.  **`projects`**: Tracks high-level initiatives.
    *   Fields: `name`, `description`, `status` ('active', 'completed', 'archived'), `userId`.
    *   Indexes: `by_user_status`.
2.  **`tasks`**: Action items linked to projects.
    *   Fields: `title`, `projectId`, `isCompleted`, `dueDate`, `priority`, `userId`.
    *   Indexes: `by_user_project`, `by_user_date` (for "Today's Focus").
3.  **`bugs`**: Software issue tracker.
    *   Fields: `title`, `description`, `severity`, `status` ('open', 'fixed'), `reproductionSteps`, `userId`.
    *   Indexes: `by_user_status`.
4.  **`prompts`**: Library of AI prompts.
    *   Fields: `title`, `content`, `tags`, `isFavorite`, `userId`.
    *   Indexes: `by_user`.
5.  **`vocab`**: Language learning vocabulary.
    *   Fields: `word` (Arabic), `translation`, `exampleSentence`, `masteryLevel` (0-5), `lastReviewed`, `userId`.
    *   Indexes: `by_user_mastery`.

## 3. Backend API Implementation

The backend logic is implemented in TypeScript functions within the `convex/` directory. All queries and mutations are secured to require authentication and strictly filter by `userId`.

*   **`convex/projects.ts`**:
    *   `get`: Fetches projects, optionally filtered by status.
    *   `create`: Creates a new project.
    *   `updateStatus`: Moves projects between active/completed/archived.
*   **`convex/tasks.ts`**:
    *   `getByProject`: Fetches tasks for a specific project.
    *   `getToday`: Fetches tasks due today or overdue.
    *   `create`: Adds a new task.
    *   `toggle`: Toggles completion status.
*   **`convex/bugs.ts`**:
    *   `get`: Fetches all bugs.
    *   `create`: Reports a new bug.
    *   `updateStatus`: Toggles between open/fixed.
*   **`convex/prompts.ts`**:
    *   `getAll`: Fetches prompt library.
    *   `create`: Saves a new prompt.
    *   `toggleFavorite`: Marks prompts as favorites.
*   **`convex/study.ts`**:
    *   `getVocab`: Fetches vocabulary list.
    *   `addVocab`: Adds new words.
    *   `reviewVocab`: Updates mastery level after review.

## 4. Frontend Implementation

The frontend uses the Next.js App Router with a "Vertical Slice" architecture where possible.

### Global Components
*   **`Sidebar`**: A responsive, collapsible sidebar navigation using `lucide-react` icons. Handles user profile display and sign-out.
*   **`CommandPalette`**: A global `Cmd+K` menu (using `cmdk`) for quick navigation to pages and creating new items (Projects, Bugs) from anywhere.
*   **`ConvexClientProvider`**: Wraps the app to provide the Convex React client context.

### Pages & Features

#### Dashboard (`app/page.tsx`)
The "Cockpit" view providing a high-level overview.
*   **`QuickStats`**: Real-time counters for Active Projects, Open Bugs, and Saved Prompts.
*   **`TodayFocus`**: A list of tasks due today.
*   **`RecentVocab`**: Displays recently added vocabulary words.

#### Project Hub (`app/projects/`)
*   **Grid View**: Displays projects as cards with status indicators.
*   **Detail View (`[id]/page.tsx`)**: Features a **Kanban Board** component for managing tasks within a project. Tasks can be dragged (conceptually) or toggled through the UI.

#### Study Center (`app/study/`)
Designed for Arabic language learning.
*   **Vocab List**: A data table of saved words.
*   **Flashcard Mode**: An interactive review mode that cycles through cards, allowing users to flip them and rate their recall.
*   **Typography**: Uses `Noto Sans Arabic` for correct rendering of Arabic text.

#### Prompt Library (`app/prompts/`)
A repository for AI engineering.
*   **Copy-to-Clipboard**: One-click copying of prompt content.
*   **Favorites**: Star your most used prompts.

#### Bug Tracker (`app/bugs/`)
A streamlined issue tracker.
*   **Reporting**: Modal form to submit bugs with severity levels.
*   **Management**: List view with status toggles.

## 5. UI/UX Polish
*   **Theme**: "Clean Industrial" aesthetic using Slate grays (`bg-slate-50` to `bg-slate-900`).
*   **Dark Mode**: Fully supported via `next-themes` and Tailwind's `dark:` variant.
*   **Responsiveness**: Mobile-friendly layout with a collapsible sidebar.
*   **Accessibility**: Semantic HTML and keyboard navigation support via `shadcn/ui` primitives.

## 6. Security & Data Isolation
*   **Authentication**: Handled by WorkOS. The `useAuth` hook provides the user session.
*   **Authorization**: Every backend function checks `ctx.auth.getUserIdentity()`. If no user is found, it throws an error.
*   **Data Scoping**: All database queries include `.filter(q => q.eq(q.field("userId"), userId))` to ensure users only see their own data.
