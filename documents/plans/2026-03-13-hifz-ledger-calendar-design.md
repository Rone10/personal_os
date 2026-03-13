# Hifz Ledger Calendar UI Design

## Goal

Refine the `/hifz` weekly board so it reads like a calendar ledger instead of a dark dashboard. The revised UI should improve readability, remove visual heaviness, and prevent text from overflowing or being clipped inside the table.

## Approved Direction

- Convert the full `/hifz` surface to a light slate/off-white treatment.
- Keep the current Sunday-to-Saturday calendar table structure.
- Remove the `Upcoming` tag from the first row/header cells.
- Preserve state semantics in the dedicated `State` row.
- Make all row content wrap naturally instead of truncating or overflowing.
- Keep all data behavior unchanged: same backend, same day sheet, same navigation, same save/clear flow.

## Layout Changes

### Page Shell

- Remove the dark page background from the `/hifz` route.
- Re-skin the hero/header section as a light card with subtle borders and low-contrast shadows.
- Keep the existing week summary and navigation controls, but align them to the lighter visual system.

### Weekly Ledger

- Keep one fixed table with a left label column and seven day columns.
- The first row should show only:
  - weekday name
  - calendar date
  - `New` and `Rev` counters
- Do not show `Upcoming` in that first row.

### Detail Rows

- Keep the same rows:
  - `Plan`
  - `State`
  - `Memorization`
  - `Revision`
  - `Note`
- Future-day state remains visible only in the `State` row.
- The left label column should be wide enough that labels like `Memorization` never visually collide or stretch across the grid.

## Text and Overflow Rules

- Remove clamping for table content in the ledger rows.
- Use normal wrapping and word-breaking in both the first column and day cells.
- Row height should grow with content instead of clipping text.
- Long memorization labels, revision labels, and notes must stay inside their own cells and push height vertically when needed.

## Interaction

- Clicking any cell for a day still opens the existing day editor.
- No backend or mutation API changes are required.
- Week navigation, page totals, and progress logic remain unchanged.

## Non-Goals

- No schema changes.
- No new summary panels or dashboard widgets.
- No changes to the day sheet form structure.
- No new filtering or sorting controls.
