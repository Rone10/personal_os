# Arabic Knowledge Retention System — Architecture Document

## Overview

A single-user, web-only knowledge retention system for studying Arabic through Quran and Hadith. You manually add vocabulary (Arabic/English), Quran verses, Hadith entries, lessons/chapters (courses/books), and plain-text notes with inline references.

### Core Requirements

- Word-level granularity with inline referencing inside notes
- Manual root and POS tagging for Arabic words
- Root search is mandatory
- Robust search with toggles: exact/fuzzy, root-only, English-only, POS/course filters
- Bi-directional backlinks: viewing a word shows all notes that reference it
- Canonical references for Quran (surah:ayah) and Hadith (collection/book/number)
- ConvexDB + Next.js stack (fixed)
- Scale: thousands of items

---

## Entity Model

### 1. Roots

The foundational unit for Arabic vocabulary. All Arabic words derive from roots.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Convex document ID |
| `letters` | string | The 3-4 Arabic letters (e.g., "ك-ت-ب") |
| `latinized` | string | Romanized form for search (e.g., "k-t-b") |
| `coreMeaning` | string | General semantic field in English (e.g., "writing, recording") |
| `notes` | string? | Your own notes about this root |
| `createdAt` | number | Timestamp |
| `updatedAt` | number | Timestamp |

---

### 2. Words

Individual vocabulary entries. Arabic words link to a Root; English words do not.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Convex document ID |
| `text` | string | The word as entered |
| `language` | "arabic" \| "english" | Language tag |
| `rootId` | string? | Reference to Root (Arabic only) |
| `type` | "harf" \| "ism" \| "fiil" \| null | Part of speech (Arabic only) |
| `wazan` | string? | Morphological pattern (e.g., فَاعِل، مَفْعُول) |
| `meanings` | Meaning[] | Array of meanings (see below) |
| `grammaticalInfo` | GrammaticalInfo? | Case endings, gender, number, etc. |
| `transliteration` | string? | Romanized version |
| `aliases` | string[] | Alternate spellings |
| `notes` | string? | Quick definition, gloss |
| `normalizedText` | string | For search (preserves alef/hamza) |
| `diacriticStrippedText` | string | For fuzzy search (tashkeel removed) |
| `searchTokens` | string[] | Tokenized forms for indexing |
| `createdAt` | number | Timestamp |
| `updatedAt` | number | Timestamp |

**Meaning Object:**

| Field | Type | Description |
|-------|------|-------------|
| `definition` | string | The meaning in English |
| `usageContext` | string? | When/how this meaning applies |
| `examples` | string[] | Example sentences or phrases |

**GrammaticalInfo Object (for Arabic):**

| Field | Type | Description |
|-------|------|-------------|
| `gender` | "masculine" \| "feminine" \| "both" \| null | Grammatical gender |
| `number` | "singular" \| "dual" \| "plural" \| null | Grammatical number |
| `caseEndings` | string? | Notes on i'rab |
| `conjugations` | string? | Verb conjugation notes |
| `nounType` | string? | e.g., "masdar", "ism fa'il", "ism maf'ul" |
| `verbForm` | number? | Form I-X for verbs |

---

### 3. Verses (Quran)

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Convex document ID |
| `surahNumber` | number | 1-114 |
| `surahNameArabic` | string | الفاتحة |
| `surahNameEnglish` | string | Al-Fatiha |
| `verseNumber` | number | Ayah number |
| `arabicText` | string | Full verse text |
| `normalizedText` | string | For search |
| `diacriticStrippedText` | string | For fuzzy search |
| `searchTokens` | string[] | Tokenized forms |
| `createdAt` | number | Timestamp |
| `updatedAt` | number | Timestamp |

---

### 4. Hadiths

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Convex document ID |
| `collection` | string | Bukhari, Muslim, Tirmidhi, etc. |
| `bookName` | string? | Book/chapter within collection |
| `hadithNumber` | string | Reference number |
| `grading` | "sahih" \| "hasan" \| "daif" \| "mawdu" \| null | Authentication grade |
| `arabicText` | string | Full hadith text |
| `narratorChain` | string? | The isnad (optional) |
| `normalizedText` | string | For search |
| `diacriticStrippedText` | string | For fuzzy search |
| `searchTokens` | string[] | Tokenized forms |
| `createdAt` | number | Timestamp |
| `updatedAt` | number | Timestamp |

---

### 5. Courses

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Convex document ID |
| `title` | string | Course name |
| `description` | string? | Overview |
| `source` | string? | Instructor, platform, URL |
| `createdAt` | number | Timestamp |
| `updatedAt` | number | Timestamp |

---

### 6. Lessons (belong to a Course)

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Convex document ID |
| `courseId` | string | Reference to Course |
| `title` | string | Lesson title |
| `order` | number | Sequence number |
| `createdAt` | number | Timestamp |
| `updatedAt` | number | Timestamp |

---

### 7. Books

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Convex document ID |
| `title` | string | Book name |
| `author` | string? | Author name |
| `description` | string? | Overview |
| `createdAt` | number | Timestamp |
| `updatedAt` | number | Timestamp |

---

### 8. Chapters (belong to a Book)

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Convex document ID |
| `bookId` | string | Reference to Book |
| `title` | string | Chapter title |
| `order` | number | Sequence number |
| `createdAt` | number | Timestamp |
| `updatedAt` | number | Timestamp |

---

### 9. Notes

Free-text notes with inline references. Can belong to a Lesson, Chapter, or stand alone.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Convex document ID |
| `title` | string | Note title |
| `body` | string | Plain text content |
| `parentType` | "lesson" \| "chapter" \| "verse" \| "hadith" \| "word" \| null | What this note belongs to |
| `parentId` | string? | ID of parent entity |
| `references` | Reference[] | Inline references with positions |
| `externalLinks` | ExternalLink[] | URLs to outside resources |
| `normalizedText` | string | For search |
| `searchTokens` | string[] | Tokenized forms |
| `createdAt` | number | Timestamp |
| `updatedAt` | number | Timestamp |

**Reference Object (inline link within note body):**

| Field | Type | Description |
|-------|------|-------------|
| `targetType` | "word" \| "verse" \| "hadith" \| "lesson" \| "chapter" \| "root" | What is being referenced |
| `targetId` | string | ID of referenced entity |
| `startOffset` | number | Character position where reference starts in body |
| `endOffset` | number | Character position where reference ends in body |
| `displayText` | string | The text shown in the note |

**ExternalLink Object:**

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | The URL |
| `label` | string | Display text |

---

### 10. Explanations

Separates interpretations/explanations from notes. Allows one word/verse to have multiple explanations from different sources.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Convex document ID |
| `content` | string | The explanation text |
| `sourceType` | "lesson" \| "chapter" \| "personal" \| "external" | Where you learned this |
| `sourceId` | string? | If from lesson/chapter, link to it |
| `sourceLabel` | string? | e.g., "Sheikh X's tafsir", "Bayyinah TV" |
| `subjectType` | "word" \| "verse" \| "hadith" \| "root" | What this explains |
| `subjectId` | string | ID of the thing being explained |
| `createdAt` | number | Timestamp |
| `updatedAt` | number | Timestamp |

---

### 11. Tags (Free-form Topics)

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Convex document ID |
| `name` | string | e.g., "Patience", "Day of Judgment", "Salah" |
| `description` | string? | Optional elaboration |
| `createdAt` | number | Timestamp |

---

### 12. EntityTags (Many-to-Many Join)

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Convex document ID |
| `tagId` | string | Reference to Tag |
| `entityType` | "word" \| "verse" \| "hadith" \| "note" \| "lesson" \| "chapter" \| "root" \| "explanation" | Type of tagged entity |
| `entityId` | string | ID of tagged entity |

---

### 13. Backlinks (Derived/Maintained)

Updated automatically whenever a Note is saved. Enables fast "what references this?" queries.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Convex document ID |
| `targetType` | string | Type of referenced entity |
| `targetId` | string | ID of referenced entity |
| `noteId` | string | The note that contains the reference |
| `snippet` | string | Context snippet from the note |
| `startOffset` | number | Position in note body |
| `endOffset` | number | Position in note body |

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                   TAGS                                       │
│                              (free-form topics)                              │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │       ENTITY_TAGS         │
                    │    (many-to-many join)    │
                    └─────────────┬─────────────┘
                                  │ tags any entity
        ┌─────────────┬───────────┼───────────┬─────────────┐
        │             │           │           │             │
        ▼             ▼           ▼           ▼             ▼
   ┌─────────┐   ┌─────────┐  ┌───────┐  ┌─────────┐  ┌──────────┐
   │  ROOTS  │   │  VERSES │  │HADITHS│  │ LESSONS │  │ CHAPTERS │
   └────┬────┘   └────┬────┘  └───┬───┘  └────┬────┘  └────┬─────┘
        │             │           │           │            │
        │ one-to-many │           │           │            │
        ▼             │           │           ▼            ▼
   ┌─────────┐        │           │      ┌─────────┐  ┌─────────┐
   │  WORDS  │        │           │      │ COURSES │  │  BOOKS  │
   └────┬────┘        │           │      └─────────┘  └─────────┘
        │             │           │
        └─────────────┴─────┬─────┴─────────────────────────┐
                            │                               │
                            ▼                               │
                    ┌──────────────┐                        │
                    │ EXPLANATIONS │ ◄──────────────────────┘
                    │ (multi-source│    explains words,
                    │  learning)   │    verses, hadiths
                    └──────────────┘
                            │
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
   ┌─────────┐                           ┌───────────┐
   │  NOTES  │ ◄─────────────────────────│ BACKLINKS │
   │ (inline │    derived index for      │ (derived) │
   │  refs)  │    "what references X?"   └───────────┘
   └─────────┘

   References flow:
   ┌─────────────────────────────────────────────────────────────┐
   │  NOTE.references[] stores inline links to:                  │
   │    → Words, Verses, Hadiths, Lessons, Chapters, Roots      │
   │                                                             │
   │  When a Note is saved:                                      │
   │    → BACKLINKS table is updated for each referenced entity │
   │    → This enables reverse lookup                           │
   └─────────────────────────────────────────────────────────────┘
```

---

## Linking System

### Inline References (within Notes)

When editing a note, you highlight text and link it to an entity. The system stores:

1. **In Note.references[]:** The target entity (type + ID) and character offsets
2. **In Backlinks table:** A record mapping targetId → noteId with snippet

**Editor Workflow:**

1. Select text in note editor
2. Press `Ctrl+K` or click "Link" button
3. Type-ahead picker appears — search for Words, Verses, Hadiths, Lessons, Chapters
4. Select target → reference is created
5. Text displays as clickable chip/link
6. Clicking opens the referenced entity with its backlinks panel

**Example Note Storage:**

```
body: "The word صبر appears frequently in the Quran, especially in Surah Al-Asr."

references: [
  {
    targetType: "word",
    targetId: "word_sabr_123",
    startOffset: 9,
    endOffset: 12,
    displayText: "صبر"
  },
  {
    targetType: "verse",
    targetId: "verse_asr_1",
    startOffset: 56,
    endOffset: 69,
    displayText: "Surah Al-Asr"
  }
]
```

### Backlinks Maintenance

**On Note Create/Update:**

1. Parse `references[]` array
2. For each reference, upsert a Backlinks record:
   - `targetType`, `targetId` → the referenced entity
   - `noteId` → this note
   - `snippet` → extract ~50 chars around the reference
   - `startOffset`, `endOffset` → positions

**On Note Delete:**

1. Remove all Backlinks records where `noteId` matches

**Querying Backlinks:**

"Show all notes referencing word صبر":
```
backlinks.filter(targetType === "word" && targetId === "word_sabr_123")
  → returns [{noteId, snippet, ...}, ...]
  → fetch note titles for display
```

### Tags (Many-to-Many)

Tags work across all entity types. To tag something:

1. Create or select a Tag
2. Create an EntityTags record linking tag → entity

**Querying by Tag:**

"Show everything tagged 'Patience'":
```
entityTags.filter(tagId === "patience_tag_id")
  → returns [{entityType, entityId}, ...]
  → fetch each entity for display
```

---

## Search System

Search is the most important feature. It must be fast, accurate, and support multiple modes.

### Normalization Rules

**Arabic Text Processing:**

| Rule | Action |
|------|--------|
| Alef/Hamza | **PRESERVE** — do NOT normalize أ إ آ ا to the same character |
| Tatweel | **REMOVE** — strip ـ (kashida) |
| Diacritics (tashkeel) | **STORE BOTH** — keep original in `normalizedText`, store stripped version in `diacriticStrippedText` |
| Letter shapes | Normalize final/medial forms (standard Unicode normalization) |

**Derived Fields to Store (per searchable entity):**

| Field | Description |
|-------|-------------|
| `normalizedText` | Original with tatweel removed, alef/hamza preserved |
| `diacriticStrippedText` | Above + tashkeel removed |
| `searchTokens` | Array of individual words/tokens from text |

### Search Algorithm

```
INPUT: query, flags (exact, rootOnly, englishOnly, posFilter, entityFilter, sourceFilter)

1. NORMALIZE query using same rules

2. IF rootOnly flag is ON:
   → Query Roots where latinized == queryRoot OR letters == queryRoot
   → Get all Words where rootId matches
   → Get all Notes referencing those words via Backlinks
   → Return combined results

3. IF exact flag is ON:
   a. Search normalizedText == normalizedQuery (exact match)
   b. Search searchTokens contains normalizedQuery (token match)
   → Apply filters (language, POS, entity type, source)
   → Return results

4. IF exact flag is OFF (fuzzy search):
   a. Try exact match first (step 3)
   b. If insufficient results, try diacriticStrippedText match
   c. If still insufficient, try token prefix/substring (n-gram)
   d. If still insufficient AND Arabic, try root match
   e. Finally, compute Levenshtein distance on candidates, rank by similarity
   → Apply filters
   → Return ranked results with match reason ("exact", "diacritic-insensitive", "root match", "fuzzy")

5. APPLY FILTERS at each step:
   - englishOnly: language === "english"
   - posFilter: type IN selectedTypes
   - entityFilter: only search specified entity types
   - sourceFilter: courseId === X OR bookId === Y
```

### Search UI Controls

**Top Search Bar:**

- Single input field
- Advanced toggle (gear icon) → expands options panel

**Advanced Options Panel:**

| Control | Type | Description |
|---------|------|-------------|
| Exact match | Toggle | ON = exact only, OFF = fuzzy fallback |
| Root search | Toggle + Input | ON = search by root letters only |
| Language | Radio | All / Arabic only / English only |
| Part of Speech | Multi-select | harf, ism, fi'l (filter Arabic words) |
| Entity type | Multi-select | Word, Verse, Hadith, Note, Lesson, Chapter |
| Source | Dropdown | All / specific Course / specific Book |

**Search Results Display:**

- Group by entity type
- Show match reason for fuzzy results (e.g., "matched by root", "similar spelling")
- Show snippet with highlighted match
- Click to open entity detail view

### Performance Strategy

1. **Index these fields in Convex:**
   - `words`: `rootId`, `language`, `type`, `normalizedText`
   - `roots`: `latinized`, `letters`
   - `verses`: `surahNumber`, `normalizedText`
   - `hadiths`: `collection`, `normalizedText`
   - `notes`: `parentId`, `parentType`
   - `backlinks`: `targetType` + `targetId` (compound), `noteId`
   - `entityTags`: `tagId`, `entityType` + `entityId` (compound)

2. **Search strategy for fuzzy:**
   - Use indexed exact/prefix queries to get candidate set
   - Apply fuzzy scoring (Levenshtein) on client side or in Convex function
   - Limit candidates to prevent full table scans

3. **Optional: N-gram index:**
   - For substring/contains search, maintain a separate `searchNgrams` collection
   - Store 3-character n-grams mapping to entity IDs
   - Query n-grams first, then fetch and rank entities

---

## UI Layout & Workflows

### Main Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Search Bar]                              [+ Add] [Settings]       │
├─────────────────┬───────────────────────────────────┬───────────────┤
│                 │                                   │               │
│   LEFT NAV      │         MAIN CONTENT              │  RIGHT PANEL  │
│                 │                                   │               │
│  ▼ Courses      │   [Note Editor / Entity View]     │  Backlinks    │
│    └ Lesson 1   │                                   │  ─────────    │
│    └ Lesson 2   │                                   │  • Note X     │
│                 │                                   │  • Note Y     │
│  ▼ Books        │                                   │               │
│    └ Chapter 1  │                                   │  Tags         │
│                 │                                   │  ─────────    │
│  ▼ Vocabulary   │                                   │  [Patience]   │
│                 │                                   │  [Salah]      │
│  ▼ Quran        │                                   │               │
│                 │                                   │  Explanations │
│  ▼ Hadith       │                                   │  ─────────    │
│                 │                                   │  • From Lsn 3 │
│                 │                                   │  • Personal   │
│                 │                                   │               │
└─────────────────┴───────────────────────────────────┴───────────────┘
```

### Key Workflows

**1. Adding a New Word:**

1. Click "+ Add" → Select "Word"
2. Form fields:
   - Arabic text (required)
   - Language toggle: Arabic / English
   - If Arabic:
     - Root (search/select or create new)
     - Type (harf / ism / fi'l)
     - Wazan (optional)
     - Transliteration (optional)
   - Meanings (add multiple)
   - Grammatical info (expandable section)
   - Notes
   - Tags (search/select or create)
3. Save → system generates normalized fields and search tokens

**2. Adding a Quran Verse:**

1. Click "+ Add" → Select "Verse"
2. Form fields:
   - Surah number (1-114)
   - Surah name (auto-filled or manual)
   - Verse number
   - Arabic text (paste full verse)
   - Tags
3. Save → can immediately add Notes or Explanations attached to this verse

**3. Adding a Hadith:**

1. Click "+ Add" → Select "Hadith"
2. Form fields:
   - Collection (dropdown: Bukhari, Muslim, Tirmidhi, etc.)
   - Book name (optional)
   - Hadith number
   - Grading (sahih / hasan / da'if / mawdu')
   - Arabic text
   - Narrator chain (optional)
   - Tags
3. Save

**4. Taking Notes in a Lesson:**

1. Navigate to Course → Lesson in left nav
2. Click "+ Add Note" in main content
3. Note editor appears:
   - Title field
   - Plain text body
   - Toolbar: [Link] [External Link] [Tags]
4. To add inline reference:
   - Select text → Click "Link" (or Ctrl+K)
   - Picker modal: search for Word, Verse, Hadith, Lesson, Chapter
   - Select → text becomes linked
5. Save → system extracts references, updates backlinks

**5. Viewing a Word's Connections:**

1. Search for word or navigate via Vocabulary
2. Word detail view shows:
   - Header: Arabic text, root, type, wazan
   - Meanings list
   - Grammatical info
   - Your notes
3. Right panel shows:
   - **Backlinks:** All notes referencing this word (with snippets)
   - **Tags:** Topics this word is tagged with
   - **Explanations:** All explanations from different sources
   - **Related words:** Other words from same root

**6. Searching:**

1. Type in search bar
2. Live suggestions appear (Words, Verses, Hadiths)
3. Press Enter for full results page
4. Toggle advanced options for filters
5. Results grouped by type, click to open

---

## ConvexDB Schema Summary

### Collections

| Collection | Primary Indexes | Search Indexes |
|------------|-----------------|----------------|
| `roots` | `latinized`, `letters` | `letters`, `latinized` |
| `words` | `rootId`, `language`, `type` | `normalizedText`, `diacriticStrippedText` |
| `verses` | `surahNumber`, `verseNumber` | `normalizedText` |
| `hadiths` | `collection`, `hadithNumber` | `normalizedText` |
| `courses` | — | `title` |
| `lessons` | `courseId`, `order` | `title` |
| `books` | — | `title` |
| `chapters` | `bookId`, `order` | `title` |
| `notes` | `parentType` + `parentId` | `normalizedText` |
| `explanations` | `subjectType` + `subjectId`, `sourceType` | — |
| `tags` | `name` | `name` |
| `entityTags` | `tagId`, `entityType` + `entityId` | — |
| `backlinks` | `targetType` + `targetId`, `noteId` | — |

---

## Operational Considerations

### Export & Backup

Implement JSON export for all data:

```
{
  "exportDate": "2025-01-12",
  "roots": [...],
  "words": [...],
  "verses": [...],
  "hadiths": [...],
  "courses": [...],
  "lessons": [...],
  "books": [...],
  "chapters": [...],
  "notes": [...],
  "explanations": [...],
  "tags": [...],
  "entityTags": [...],
  "backlinks": [...]
}
```

Also provide Markdown export for courses/books:

```markdown
# Course: Arabic Grammar 101

## Lesson 1: Introduction to Harf

[Note content with [[linked words]] converted to plain text or placeholders]

## Lesson 2: Types of Ism
...
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Deleting a Word that's referenced | Soft delete or warn user; remove backlinks |
| Changing a Root's letters | Update all derived word's search tokens |
| Duplicate words | Show warning in vocabulary manager; allow merge |
| Very long notes | Pagination in backlinks snippets |
| Orphaned backlinks | Periodic cleanup job; or cascade delete |

### Future Considerations (Not in V1)

- Spaced repetition flashcards from vocabulary
- Graph visualization of connections
- Import from Quran/Hadith APIs
- Mobile app / offline sync
- Sharing courses publicly

---

## Implementation Checklist

### Phase 1: Foundation

- [ ] Set up Convex schema for all collections
- [ ] Create indexes per schema summary
- [ ] Build basic CRUD API functions for each entity
- [ ] Implement normalization utilities (Arabic text processing)

### Phase 2: Core UI

- [ ] Left navigation (Courses, Books, Vocabulary, Quran, Hadith)
- [ ] Entity list views (paginated)
- [ ] Entity detail views
- [ ] Add/Edit forms for each entity type

### Phase 3: Notes & Linking

- [ ] Plain text note editor
- [ ] Inline reference picker (Ctrl+K flow)
- [ ] Reference storage with offsets
- [ ] Backlinks maintenance on note save/delete
- [ ] Backlinks panel in right sidebar

### Phase 4: Search

- [ ] Basic search (exact match on normalized text)
- [ ] Root search toggle
- [ ] Language filter
- [ ] POS filter
- [ ] Entity type filter
- [ ] Fuzzy search fallback
- [ ] Search results page with grouping

### Phase 5: Enhancements

- [ ] Tags system (create, assign, filter by)
- [ ] Explanations (multi-source for same entity)
- [ ] Export/Import JSON
- [ ] Markdown export for courses/books

### Phase 6: Polish

- [ ] Keyboard shortcuts
- [ ] Search performance optimization
- [ ] Empty states and onboarding
- [ ] Error handling and validation

---

## Quick Reference: Arabic Word Entry Fields

When adding an Arabic word, capture:

| Field | Required | Example |
|-------|----------|---------|
| Arabic text | ✓ | صَبْر |
| Root | ✓ | ص-ب-ر |
| Type | ✓ | ism |
| Wazan | ○ | فَعْل |
| Meanings | ✓ | [{definition: "patience", usageContext: "in hardship"}] |
| Transliteration | ○ | sabr |
| Gender | ○ | masculine |
| Number | ○ | singular |
| Noun type | ○ | masdar |
| Notes | ○ | "Often paired with shukr (gratitude)" |
| Tags | ○ | [Patience, Character] |

---

## Quick Reference: Search Modes

| Mode | When to Use | How It Works |
|------|-------------|--------------|
| Default | General browsing | Fuzzy match with fallbacks |
| Exact | Know precise spelling | normalizedText === query |
| Root only | Find word family | rootId match → all derived words |
| English only | Searching definitions | language === "english" |
| By POS | Grammatical study | type === "harf" / "ism" / "fi'l" |
| By source | Review specific course | courseId / bookId filter |

---

*Document version: 1.0*
*Last updated: January 2025*








Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Arabic Knowledge Retention System - Implementation Plan

 Overview

 Complete overhaul of /study route into an Arabic Knowledge Retention System for studying Arabic through Quran and Hadith.
 Replaces existing study implementation with 13 new entities, robust search, inline note references, and bi-directional
 backlinks.

 Key Decisions

 - Fresh start: Database is empty, no migration needed
 - Full hierarchy: All 13 entities including courses/lessons/books/chapters
 - Replace completely: Delete existing study code, build new
 - Plain text editor: Ctrl+K link picker for inline references
 - Preserve alef/hamza: Don't normalize variants in search
 - Verse ranges: Support both individual verses AND ayah ranges
 - Include flashcards: Spaced repetition for vocabulary
 - Quran lookup: Basic API helper to fetch verse text

 ---
 Phase 1: Schema & Normalization

 Goal

 Define all 13 entities with proper indexes and update Arabic normalization.

 Files to Modify

 convex/schema.ts - Remove old study tables, add:
 - roots - letters, latinized, coreMeaning, notes
 - words - arabicText, arabicSearchable, rootId, type (harf/ism/fiil), wazan, meanings[], grammaticalInfo, transliteration,
 masteryLevel, nextReview
 - verses - surahNumber, ayahStart, ayahEnd, arabicText, arabicSearchable
 - hadiths - collection, bookName, hadithNumber, grading, arabicText, arabicSearchable, narratorChain
 - courses - title, description, order
 - lessons - courseId, title, order
 - books - title, author, description, order
 - chapters - bookId, title, order
 - notes - title, content, inlineReferences[], externalLinks[], parentType, parentId
 - explanations - targetType, targetId, source, text, language, order
 - tags - name, color
 - entityTags - tagId, entityType, entityId
 - backlinks - sourceType, sourceId, targetType, targetId

 convex/_lib/arabic.ts - Update normalization:
 - Remove diacritics/tashkeel
 - Remove tatweel
 - PRESERVE alef/hamza variants (do not normalize)

 lib/arabic.ts - Mirror backend changes

 Verification

 - npx convex dev compiles without errors
 - Schema indexes are valid

 ---
 Phase 2: Backend API

 Goal

 Implement CRUD for all 13 entities with proper auth.

 Files to Create

 convex/study/
   roots.ts      - list, getById, create, update, delete
   words.ts      - list, listByRoot, getDetail, create, update, delete, reviewWord
   verses.ts     - list, listBySurah, create, update, delete
   hadiths.ts    - list, listByCollection, create, update, delete
   courses.ts    - listCourses, getLessons, createCourse, createLesson, etc.
   books.ts      - listBooks, getChapters, createBook, createChapter, etc.
   notes.ts      - list, getById, create, update, delete + backlink maintenance
   explanations.ts - listByTarget, create, update, delete, reorder
   tags.ts       - list, create, update, delete, tagEntity, untagEntity
   search.ts     - getSearchData (bulk query for client-side search)
   backlinks.ts  - getBacklinksFor

 Files to Delete

 - convex/study.ts (1200+ lines)

 Verification

 - All mutations check userId
 - Cascading deletes work
 - Backlinks auto-update on note save/delete

 ---
 Phase 3: UI Layout

 Goal

 Build three-panel layout shell.

 Files to Create

 app/study/
   page.tsx                          - Server wrapper with Suspense
   _components/
     StudyLayout.tsx                 - Three-panel layout container
     NavigationTree.tsx              - Left panel (collapsible hierarchy)
     ContextPanel.tsx                - Right panel (backlinks/tags/explanations)
     MainContent.tsx                 - Center panel router

 URL State Design

 /study                    - Dashboard/recent items
 /study?view=roots         - Root list
 /study?view=root&id=xxx   - Root detail
 /study?view=words         - Word list
 /study?view=word&id=xxx   - Word detail
 /study?view=verses        - Verse list
 /study?view=verse&id=xxx  - Verse detail
 /study?view=courses       - Course list
 /study?view=course&id=xxx - Course with lessons
 /study?view=note&id=xxx   - Note editor

 Verification

 - Responsive layout on desktop
 - URL state persists on refresh
 - Panel collapse/expand works

 ---
 Phase 4: Entity Views & Forms

 Goal

 Implement all entity CRUD UIs.

 Files to Create

 Detail Views:
 app/study/_components/
   RootDetail.tsx
   WordDetail.tsx
   VerseDetail.tsx
   HadithDetail.tsx
   CourseDetail.tsx
   LessonDetail.tsx
   BookDetail.tsx
   ChapterDetail.tsx

 Form Dialogs:
 app/study/_components/
   RootFormDialog.tsx
   WordFormDialog.tsx      - type (harf/ism/fiil), wazan, grammar
   VerseFormDialog.tsx     - surah picker, ayah range
   HadithFormDialog.tsx    - collection, grading, narrator
   CourseFormDialog.tsx
   LessonFormDialog.tsx
   BookFormDialog.tsx
   ChapterFormDialog.tsx
   ExplanationFormDialog.tsx
   TagFormDialog.tsx

 Verification

 - All CRUD operations work
 - Arabic text renders RTL correctly
 - Forms validate input

 ---
 Phase 5: Note Editor with Inline References

 Goal

 Plain text editor with Ctrl+K link picker.

 Files to Create

 app/study/_components/
   NoteEditor.tsx          - Textarea + Ctrl+K handling
   LinkPicker.tsx          - Entity search/select modal
   NoteRenderer.tsx        - Display with clickable links

 lib/
   noteParser.ts           - Parse/serialize note references

 Storage Format

 {
   content: "The word كتب appears in verse 2:2...",
   inlineReferences: [
     { startOffset: 9, endOffset: 12, entityType: "word", entityId: "xxx" },
     { startOffset: 28, endOffset: 31, entityType: "verse", entityId: "yyy" }
   ]
 }

 Verification

 - Ctrl+K opens picker at cursor
 - Links render as clickable chips
 - Backlinks update on save

 ---
 Phase 6: Search

 Goal

 Robust search with filters.

 Files to Create

 app/study/_components/
   SearchBar.tsx           - Input with filter chips
   SearchResults.tsx       - Grouped results display

 lib/
   search.ts               - searchEntities(query, data, filters)

 Search Algorithm

 1. Detect language (Arabic vs Latin)
 2. Arabic: exact/substring on arabicSearchable (diacritic-insensitive, alef/hamza preserved)
 3. Latin: check if root pattern (c-c-c), else fuzzy on meanings
 4. Apply filters (type, language, entity type)
 5. Rank: exact > prefix > contains > fuzzy

 Verification

 - Arabic search ignores diacritics
 - Alef/hamza variants distinguished
 - Root search works
 - Fuzzy English works

 ---
 Phase 7: Backlinks

 Goal

 Auto-maintain backlinks, show in context panel.

 Files to Create/Modify

 app/study/_components/
   BacklinksPanel.tsx      - Display referencing notes

 convex/study/
   notes.ts                - Update backlinks on save/delete
   backlinks.ts            - getBacklinksFor query

 Verification

 - Backlinks created on note save
 - Backlinks removed on note delete
 - Panel shows correct references

 ---
 Phase 8: Flashcards

 Goal

 Spaced repetition for vocabulary.

 Files to Create

 app/study/_components/
   FlashcardReview.tsx     - Review session UI
   FlashcardStats.tsx      - Due count, mastery distribution

 Algorithm

 Level 1: 1 day    Level 4: 14 days
 Level 2: 3 days   Level 5: 30 days
 Level 3: 7 days

 Success: level = min(5, level + 1)
 Fail: level = max(1, level - 1)

 Verification

 - Only due words appear
 - Mastery updates correctly
 - Next review calculated properly

 ---
 Phase 9: Quran Lookup

 Goal

 Fetch verse text from API.

 Files to Create

 lib/
   quranApi.ts             - fetchVerse, fetchVerseRange

 app/study/_components/
   QuranLookup.tsx         - Surah/ayah input
   VerseLookupDialog.tsx   - Modal with preview + save

 API

 // Using alquran.cloud
 const fetchVerse = async (surah: number, ayah: number) => {
   const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}`);
   const data = await res.json();
   return data.data.text;
 };

 Verification

 - API returns Arabic text
 - User can save fetched verse
 - Errors handled gracefully

 ---
 Phase 10: Integration

 Goal

 Connect all pieces, update external references.

 Files to Modify

 - components/Sidebar.tsx - Keep Study link
 - components/CommandPalette.tsx - Update actions (Add Word, Add Verse, Search Study)
 - app/_components/RecentVocab.tsx - Use new word API

 Files to Delete (entire old study system)

 - All files in app/study/_components/ (existing ones)
 - Legacy schema entries for studyWords, studyPhrases, etc.

 Verification

 - Navigation from sidebar works
 - Command palette actions work
 - Dashboard widget shows data
 - No console errors

 ---
 Critical Files Reference
 ┌───────────────────────────────────────────┬───────────────────────────────────┐
 │                   File                    │              Purpose              │
 ├───────────────────────────────────────────┼───────────────────────────────────┤
 │ convex/schema.ts                          │ Schema definition (13 new tables) │
 ├───────────────────────────────────────────┼───────────────────────────────────┤
 │ convex/_lib/arabic.ts                     │ Backend normalization             │
 ├───────────────────────────────────────────┼───────────────────────────────────┤
 │ lib/arabic.ts                             │ Frontend normalization            │
 ├───────────────────────────────────────────┼───────────────────────────────────┤
 │ convex/study.ts                           │ Current backend (to delete)       │
 ├───────────────────────────────────────────┼───────────────────────────────────┤
 │ app/study/_components/StudyPageClient.tsx │ Current UI pattern reference      │
 └───────────────────────────────────────────┴───────────────────────────────────┘
 ---
 Verification Plan

 After implementation:

 1. Schema: Run npx convex dev - no errors
 2. CRUD: Create/read/update/delete each entity type
 3. Search: Test Arabic with diacritics, root search, fuzzy English
 4. Notes: Create note with inline refs, verify backlinks appear
 5. Flashcards: Add words, mark some for review, test review flow
 6. Quran lookup: Fetch verse, save to database
 7. Navigation: Sidebar, command palette, URL routing all work
 8. RTL: Arabic text displays correctly with proper direction
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌