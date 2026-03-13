# Hifz Ledger Calendar Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the current dark `/hifz` weekly board into a light calendar ledger, remove the header-row `Upcoming` badge, and make all table content wrap cleanly without overflow.

**Architecture:** This is a presentation-only change in the web app. Keep the current Convex queries, route behavior, and day sheet interaction intact; only rework the `/hifz` page shell and the weekly board styling/rendering. The board remains a single Sunday-to-Saturday table with the same row model.

**Tech Stack:** Next.js App Router, React, Tailwind CSS v4, existing shadcn/ui primitives, existing `/hifz` client components

---

### Task 1: Re-skin the `/hifz` page shell

**Files:**
- Modify: `/Users/harunanjie/Documents/dev_home/jamrah_media/personal_os/apps/web/app/hifz/_components/HifzPageClient.tsx`

**Step 1: Identify the dark surfaces to replace**

Review the top-level wrapper and both major sections in `HifzPageClient.tsx`.

Expected targets:
- root page `div` using dark background classes
- hero/header `section`
- weekly ledger container `section`
- navigation buttons that still depend on dark fill colors

**Step 2: Write the minimal visual contract before editing**

Lock these decisions in comments or a scratch note while editing:
- page background becomes light slate/off-white
- hero and ledger sections become light cards
- accents stay emerald/amber, but the dominant surface is light
- controls remain readable in both default and dark-theme app contexts

**Step 3: Implement the light page shell**

Update `HifzPageClient.tsx` so:
- the page wrapper uses a light neutral background instead of deep charcoal
- hero and ledger sections use pale backgrounds, subtle borders, and restrained shadows
- text colors switch from hardcoded light-on-dark values to light-surface-safe slate tones
- previous/next buttons no longer rely on dark fills

**Step 4: Run typecheck**

Run: `pnpm --filter web typecheck`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/app/hifz/_components/HifzPageClient.tsx
git commit -m "refactor: lighten hifz page shell"
```

### Task 2: Remove the header-row `Upcoming` badge

**Files:**
- Modify: `/Users/harunanjie/Documents/dev_home/jamrah_media/personal_os/apps/web/app/hifz/_components/HifzWeekBoard.tsx`

**Step 1: Locate the top-row badge rendering**

Find the top-row day header cell rendering inside `HifzWeekBoard.tsx`.

Expected source:
- current `getStateBadge(day)` usage in the first row
- header cell block that renders the status badge beside the weekday/date

**Step 2: Change the top row contract**

Update the first row so it renders only:
- weekday
- date
- `New` counter
- `Rev` counter

Do not render `Upcoming` or any other state badge in the first row.

**Step 3: Preserve the `State` row behavior**

Keep state badges in the `State` row so future days can still show `Upcoming` there.

**Step 4: Run typecheck**

Run: `pnpm --filter web typecheck`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/app/hifz/_components/HifzWeekBoard.tsx
git commit -m "refactor: remove hifz header state badges"
```

### Task 3: Fix overflow and wrapping in the first column and all day cells

**Files:**
- Modify: `/Users/harunanjie/Documents/dev_home/jamrah_media/personal_os/apps/web/app/hifz/_components/HifzWeekBoard.tsx`

**Step 1: Audit every truncation and nowrap risk**

Find and remove any table content that uses truncation-oriented styling such as:
- `line-clamp-*`
- overly narrow fixed widths
- excessive uppercase tracking on long labels
- layout combinations that force content into one line

**Step 2: Widen and normalize the left label column**

Adjust the left label column so:
- labels like `Memorization` and `Revision` fit comfortably
- letter spacing is reduced to a readable level
- text can wrap instead of stretching visually across the column

**Step 3: Make row content wrap naturally**

Update day cells so:
- memorization text uses `whitespace-normal` and `break-words`
- revision text uses `whitespace-normal` and `break-words`
- note text uses `whitespace-normal` and `break-words`
- row height grows vertically with content
- content stays inside its own column without clipping or overlap

**Step 4: Keep density high without reintroducing cards**

Do not revert to card layout. Keep the ledger/table structure and use padding, row sizing, and subtle grid styling to preserve readability.

**Step 5: Run typecheck**

Run: `pnpm --filter web typecheck`

Expected: PASS

**Step 6: Manual verification**

Check in the browser:
- long `Memorization` label in the left column does not overflow
- long freeform page labels wrap inside the correct day column
- longer notes increase row height instead of clipping
- no content crosses cell boundaries at desktop width
- horizontal scrolling still works if the viewport is narrow

**Step 7: Commit**

```bash
git add apps/web/app/hifz/_components/HifzWeekBoard.tsx
git commit -m "fix: wrap hifz ledger cell content"
```

### Task 4: Final visual cleanup and regression pass

**Files:**
- Modify: `/Users/harunanjie/Documents/dev_home/jamrah_media/personal_os/apps/web/app/hifz/_components/HifzPageClient.tsx`
- Modify: `/Users/harunanjie/Documents/dev_home/jamrah_media/personal_os/apps/web/app/hifz/_components/HifzWeekBoard.tsx`

**Step 1: Align the page and table surfaces**

Do one final pass to make sure:
- the page shell and ledger belong to the same light visual system
- the table no longer feels visually heavy
- emerald/amber accents remain useful but not dominant

**Step 2: Re-check interaction**

Verify:
- clicking any cell still opens the day sheet
- week navigation still works
- no state badges disappeared from the `State` row
- no save/clear interaction code was changed

**Step 3: Run final verification**

Run:

```bash
pnpm --filter web typecheck
```

Expected: PASS

**Step 4: Final manual checklist**

Confirm:
- no dark page background remains
- no `Upcoming` badge appears in the first row
- first-column text does not overflow
- memorization/revision/note text wraps instead of truncating
- the page still feels like a weekly calendar ledger

**Step 5: Commit**

```bash
git add apps/web/app/hifz/_components/HifzPageClient.tsx apps/web/app/hifz/_components/HifzWeekBoard.tsx
git commit -m "refactor: polish hifz ledger calendar"
```
