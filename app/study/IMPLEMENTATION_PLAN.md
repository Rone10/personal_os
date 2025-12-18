# Study Center — Quran/Arabic Capture & Retrieval

**Overall Progress:** `100%`

## Summary

This feature expands the existing Study Center (`./app/study/page.tsx`) from a simple “vocab + flashcards” tool into a structured personal knowledge system for Quran/Arabic study. You will be able to save **words** and **phrases** separately, attach **multiple meanings** from different sources, and connect those meanings to **references** (Quran ranges, structured hadith citations, and optional “other” sources with URL/title). You will also be able to capture **Quran passages** (surah + ayah range) including the **Arabic ayah text**, store **multiple translations/meanings** per passage, and add **personal notes** to both terms and passages.

All search will operate **only across saved items** (no external Quran/hadith databases). Search must support **diacritics-insensitive Arabic matching** and **fuzzy English matching**. When viewing a term’s Quran reference, the UI should automatically show any saved Quran passage capture(s) that overlap that reference range.

This work integrates with the existing architecture: Next.js App Router feature slice under `./app/study/`, shared UI primitives via shadcn/ui, and a Convex backend (`./convex/schema.ts`, `./convex/study.ts`) with strict `userId` scoping using `ctx.auth.getUserIdentity()`.

**Build Note:** Next.js requires `useSearchParams()` to be inside a Suspense boundary during prerender. The route uses a Server Component wrapper (`./app/study/page.tsx`) that renders the Client UI (`./app/study/_components/StudyPageClient.tsx`) within `Suspense`.

## Tasks

- [x] 🟩 **Step 1: Define study data model (schema + migration)**
  - **Goal:** Add the minimum set of Convex tables to represent words, phrases, meanings, references, Quran passages, and notes in a clean, queryable way (while preserving existing vocab data).
  - [ ] 🟥 Update `./convex/schema.ts` to add new tables (names can be adjusted, but keep “word” vs “phrase” separate):
    - [ ] 🟥 `studyWords`: `userId`, `arabicText`, `arabicNormalized`, `transliteration?`, `root?`
    - [ ] 🟥 `studyPhrases`: `userId`, `arabicText`, `arabicNormalized`, `transliteration?`
    - [ ] 🟥 `studyQuranPassages`: `userId`, `surah`, `ayahStart`, `ayahEnd?`, `arabicText` (raw pasted text is acceptable)
    - [ ] 🟥 `studyMeanings`: `userId`, `ownerType` (`"word" | "phrase" | "quran_passage"`), `ownerId` (string), `text`, `language?`, `sourceId?`, `isPrimary`, `order`
    - [ ] 🟥 `studyNotes`: `userId`, `ownerType` (`"word" | "phrase" | "quran_passage"`), `ownerId` (string), `content`
    - [ ] 🟥 `studySources`: `userId`, `kind` (e.g. `"quran_translation" | "tafsir" | "hadith" | "dictionary" | "other"`), `title?`, `url?`, `author?`, `lastUsedAt?`
    - [ ] 🟥 `studyReferences`: attach references to a specific meaning (`meaningId`) with:
      - [ ] 🟥 `type`: `"quran" | "hadith" | "other"`
      - [ ] 🟥 Quran fields: `surah`, `ayahStart`, `ayahEnd?`
      - [ ] 🟥 Hadith fields (structured): `collection`, `book?`, `hadithNumber`, `chapter?`, `grade?`, `narrator?`
      - [ ] 🟥 Optional source-ish fields (all optional): `title?`, `url?`, `notes?`
    - [ ] 🟥 `studyWordPhraseLinks`: link a word to phrase examples: `userId`, `wordId`, `phraseId`, `order?`
  - [ ] 🟥 Add necessary indexes for efficient “my data only” access:
    - [ ] 🟥 `by_user` indexes on each table.
    - [ ] 🟥 `studyWords` index for filtering by root (e.g. `["userId","root"]`).
    - [ ] 🟥 `studyQuranPassages` index for surah (e.g. `["userId","surah"]`) to support overlap filtering in code.
    - [ ] 🟥 `studyMeanings` index by owner (e.g. `["userId","ownerType","ownerId","order"]`).
    - [ ] 🟥 `studyReferences` index by meaningId.
  - [ ] 🟥 Decide how to handle the existing `vocab` table:
    - [ ] 🟥 **Preferred minimal path:** keep `vocab` temporarily, add a one-time “migrate vocab → studyWords + studyMeanings” mutation, then update UI/queries to use new tables.
    - [ ] 🟥 Ensure no user data is lost; keep `vocab` readable until migration is verified.

- [x] 🟩 **Step 2: Implement Convex API for CRUD + safe cascading deletes**
  - **Goal:** Provide a complete, strictly-authenticated API surface for create/read/update/delete across words, phrases, meanings, references, Quran passages, sources, and notes.
  - [ ] 🟥 Add helpers in `./convex/study.ts` (or a small `./convex/_lib/studyAuth.ts`) mirroring patterns in `./convex/todos.ts`:
    - [ ] 🟥 `requireIdentity(ctx)` returning `identity.subject`
    - [ ] 🟥 `ensureOwnership(ctx, table, id, userId)`
  - [ ] 🟥 Add Arabic normalization utility used on create/update:
    - [ ] 🟥 Create `./convex/_lib/arabic.ts` with `normalizeArabic(text: string)` that strips tashkeel/harakat and tatweel and normalizes common letter variants.
  - [ ] 🟥 Queries (read):
    - [ ] 🟥 `listWords` (optionally filter by `root`)
    - [ ] 🟥 `listPhrases`
    - [ ] 🟥 `getWordDetail(wordId)` → word + meanings + notes + linked phrases + references (via meaningId)
    - [ ] 🟥 `getPhraseDetail(phraseId)` → phrase + meanings + notes + references
    - [ ] 🟥 `listQuranPassages` (optionally filter by `surah`)
    - [ ] 🟥 `getQuranPassageDetail(passageId)` → passage + meanings (translations) + notes
    - [ ] 🟥 `listSources(kind?)` for UI autofill
    - [ ] 🟥 `findOverlappingQuranCaptures({ surah, ayahStart, ayahEnd })`:
      - [ ] 🟥 Query `studyQuranPassages` by `userId + surah`, then filter in code for range overlap to support “auto show capture when viewing a Quran reference”.
  - [ ] 🟥 Mutations (write):
    - [ ] 🟥 `createWord`, `updateWord`, `deleteWord` (delete should cascade: meanings, notes, references, word-phrase links)
    - [ ] 🟥 `createPhrase`, `updatePhrase`, `deletePhrase` (cascade similarly)
    - [ ] 🟥 `createQuranPassage`, `updateQuranPassage`, `deleteQuranPassage` (cascade meanings/translations + notes)
    - [ ] 🟥 `createMeaning`, `updateMeaning`, `deleteMeaning` (ensure `isPrimary` uniqueness per owner; maintain `order`)
    - [ ] 🟥 `createReference`, `updateReference`, `deleteReference` (validate required fields by `type`)
    - [ ] 🟥 `createNote`, `updateNote`, `deleteNote`
    - [ ] 🟥 `upsertSource` (for optional URL/title “autofill from what I used before”)
    - [ ] 🟥 `linkWordToPhrase` / `unlinkWordToPhrase` (manage examples)
  - [ ] 🟥 Validation/edge cases:
    - [ ] 🟥 Quran ranges: enforce `ayahStart >= 1`, `ayahEnd >= ayahStart` when provided; store single-ayah capture as `ayahEnd = undefined` (or same as start) consistently.
    - [ ] 🟥 Hadith: enforce `collection` + `hadithNumber` required; all other fields optional.
    - [ ] 🟥 All mutations must verify ownership via `userId`.

- [x] 🟩 **Step 3: Build the new Study Center UI skeleton (split view + routing state)**
  - **Goal:** Replace the current two-tab page with a “capture + retrieve” workspace: list/search on the left and a detail panel on the right.
  - [ ] 🟥 Refactor `./app/study/page.tsx`:
    - [ ] 🟥 Add a search input (persistent at top).
    - [ ] 🟥 Add a left sidebar list with a segmented control or tabs for `Words`, `Phrases`, `Verses`.
    - [ ] 🟥 Add a right detail panel that renders the selected item’s details (word/phrase/passage).
    - [ ] 🟥 Store selection in URL (recommended: `?type=word&id=...`) so it’s shareable and survives refresh.
  - [ ] 🟥 Create route-local components under `./app/study/_components/` (keep shared `./components/*` usage minimal):
    - [ ] 🟥 `StudySearchBar`
    - [ ] 🟥 `StudyList` + `StudyListItem`
    - [ ] 🟥 `WordDetail`, `PhraseDetail`, `QuranPassageDetail`
    - [ ] 🟥 `MeaningList` (with primary indicator), `ReferencesList`, `NotesPanel`
  - [ ] 🟥 UX constraints:
    - [ ] 🟥 Arabic text containers use `font-arabic`, `dir="rtl"`, and right alignment (per `documents/design.md`).
    - [ ] 🟥 Keep “flashcards” separate and minimal (do not overload the detail panel with flashcard UI).

- [x] 🟩 **Step 4: Implement capture flows (create/edit) for words, phrases, verses, meanings, references, notes**
  - **Goal:** Make adding and maintaining entries fast, structured, and consistent.
  - [ ] 🟥 Add “Create” actions to `./app/study/page.tsx` (buttons or menu):
    - [ ] 🟥 Add Word
    - [ ] 🟥 Add Phrase
    - [ ] 🟥 Add Verse Capture
  - [ ] 🟥 Build modals/forms in `./app/study/_components/` using existing shadcn/ui patterns:
    - [ ] 🟥 `WordFormDialog` (arabic/root/transliteration + optional “add example phrase” inline)
    - [ ] 🟥 `PhraseFormDialog`
    - [ ] 🟥 `QuranPassageFormDialog` (surah + ayah range + arabic text)
    - [ ] 🟥 `MeaningForm` (multi-meaning; set primary; optional source picker/autofill)
    - [ ] 🟥 `ReferenceForm` (switch by type: Quran / Hadith / Other; show only relevant fields)
    - [ ] 🟥 `NoteForm` (freeform personal thoughts)
  - [ ] 🟥 Edit support:
    - [ ] 🟥 Add inline “Edit” buttons in detail views for the item itself, meanings, references, and notes.
    - [ ] 🟥 Ensure normalized Arabic fields are updated when Arabic text changes.
  - [ ] 🟥 Source “autofill” requirement:
    - [ ] 🟥 In meaning/reference forms, implement an optional source picker that suggests from `api.study.listSources`.
    - [ ] 🟥 Allow manual entry of title/url when no match; on save, `upsertSource` for future reuse.

- [x] 🟩 **Step 5: Implement search (Arabic normalized + fuzzy English) and auto-linking to saved verse captures**
  - **Goal:** Make retrieval fast and reliable across saved items, and automatically surface saved verse captures when viewing Quran references.
  - [ ] 🟥 Add frontend search utilities:
    - [ ] 🟥 Create `./lib/arabic.ts` with `normalizeArabic` equivalent to backend (keep behavior aligned).
    - [ ] 🟥 Create `./lib/fuzzy.ts` implementing a small fuzzy matcher (no new dependency) for English fields (meaning text, source title, etc.).
  - [ ] 🟥 Implement a unified client-side search pipeline in `./app/study/page.tsx` (or `./app/study/_components/useStudySearch.ts`):
    - [ ] 🟥 Fetch lists needed for search via Convex queries (words, phrases, passages, plus “primary meaning” for list display).
    - [ ] 🟥 Arabic: compare normalized query against `arabicNormalized`.
    - [ ] 🟥 English: fuzzy match against meaning text and optionally source titles.
    - [ ] 🟥 Ranking: prioritize exact Arabic matches, then root matches, then fuzzy English.
  - [ ] 🟥 Auto-show verse captures:
    - [ ] 🟥 In `WordDetail` / `PhraseDetail`, for each Quran reference call `api.study.findOverlappingQuranCaptures`.
    - [ ] 🟥 Render a “Saved Captures” section under each Quran reference, showing overlapping passages and their translations/meanings.
  - [ ] 🟥 Edge cases:
    - [ ] 🟥 Multiple overlapping saved captures should all appear (e.g., one capture for 2:255 and another for 2:255–257).
    - [ ] 🟥 References without `ayahEnd` should be treated as single-ayah ranges for overlap logic.

- [x] 🟩 **Step 6: Update flashcards to use words (minimal card) + keep dashboard widgets working**
  - **Goal:** Preserve the existing “review” loop while shifting from old `vocab` data to the new structured word model.
  - [ ] 🟥 Decide minimal flashcard content:
    - [ ] 🟥 Front: Arabic word
    - [ ] 🟥 Back: the word’s **primary meaning** only (no references/notes)
  - [ ] 🟥 Update flashcard data source:
    - [ ] 🟥 Update `./app/study/page.tsx` to pass a word list that includes primary meaning and review metadata.
    - [ ] 🟥 Update `./components/Flashcard.tsx` (or replace with `./app/study/_components/Flashcard.tsx`) to read from the new shape.
    - [ ] 🟥 Extend the schema for spaced repetition on words (either keep current fields on a new word table or add `masteryLevel` + `nextReview` to `studyWords`).
    - [ ] 🟥 Update review mutation logic in `./convex/study.ts` to patch the new word table.
  - [ ] 🟥 Ensure any existing widgets don’t break:
    - [ ] 🟥 Update `./app/_components/RecentVocab.tsx` to use the new word query (or keep a compatibility query like `getVocab` that returns “words”).
    - [ ] 🟥 If migrating from `vocab`, ensure the dashboard still shows recent words after migration.
