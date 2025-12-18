/**
 * Study Center backend (v2)
 *
 * This file implements a structured “capture and retrieve” model for Quran/Arabic study:
 * - Words and phrases are stored separately.
 * - Each word/phrase/passage can have multiple meanings from different sources.
 * - Meanings can have references: Quran ranges, structured hadith citations, or “other”.
 * - A single note per entity stores personal reflections.
 *
 * Search is implemented on the client for saved items only. To support Arabic search,
 * we store a normalized Arabic field (diacritics removed, common variants normalized).
 */

import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { normalizeArabic } from "./_lib/arabic";

type OwnerType = "word" | "phrase" | "quran_passage";
type ReferenceType = "quran" | "hadith" | "other";

async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return identity;
}

/**
 * Query-friendly auth helper.
 *
 * In this app, many pages optimistically run queries during initial hydration.
 * The Convex auth token may not be available on the very first render, even if
 * the user is signed in. For queries, we return empty results instead of
 * throwing, so the UI can render and then re-fetch once auth is ready.
 *
 * Mutations should continue to use `requireIdentity` and throw on unauth.
 */
async function getUserIdOrNull(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

async function ensureWordOwnership(ctx: QueryCtx | MutationCtx, id: Id<"studyWords">, userId: string) {
  const word = await ctx.db.get(id);
  if (!word || word.userId !== userId) throw new Error("Word not found");
  return word;
}

async function ensurePhraseOwnership(ctx: QueryCtx | MutationCtx, id: Id<"studyPhrases">, userId: string) {
  const phrase = await ctx.db.get(id);
  if (!phrase || phrase.userId !== userId) throw new Error("Phrase not found");
  return phrase;
}

async function ensurePassageOwnership(ctx: QueryCtx | MutationCtx, id: Id<"studyQuranPassages">, userId: string) {
  const passage = await ctx.db.get(id);
  if (!passage || passage.userId !== userId) throw new Error("Passage not found");
  return passage;
}

async function ensureOwnerExists(ctx: QueryCtx | MutationCtx, ownerType: OwnerType, ownerId: string, userId: string) {
  if (ownerType === "word") {
    await ensureWordOwnership(ctx, ownerId as Id<"studyWords">, userId);
    return;
  }
  if (ownerType === "phrase") {
    await ensurePhraseOwnership(ctx, ownerId as Id<"studyPhrases">, userId);
    return;
  }
  await ensurePassageOwnership(ctx, ownerId as Id<"studyQuranPassages">, userId);
}

function validateQuranRange(surah: number, ayahStart: number, ayahEnd?: number) {
  if (!Number.isFinite(surah) || surah < 1) throw new Error("Invalid surah");
  if (!Number.isFinite(ayahStart) || ayahStart < 1) throw new Error("Invalid ayahStart");
  if (ayahEnd !== undefined) {
    if (!Number.isFinite(ayahEnd) || ayahEnd < ayahStart) throw new Error("Invalid ayahEnd");
  }
}

function computeNextReview(masterlyLevel: number) {
  // Simple spaced repetition logic:
  // Level 1: 1 day, 2: 3 days, 3: 7 days, 4: 14 days, 5: 30 days
  const intervalsDays = [1, 3, 7, 14, 30];
  const daysToAdd = intervalsDays[Math.min(masterlyLevel, 5) - 1] || 1;
  return Date.now() + daysToAdd * 24 * 60 * 60 * 1000;
}

async function unsetOtherPrimaryMeanings(ctx: MutationCtx, userId: string, ownerType: OwnerType, ownerId: string) {
  const meanings = await ctx.db
    .query("studyMeanings")
    .withIndex("by_user_owner", (q) => q.eq("userId", userId).eq("ownerType", ownerType).eq("ownerId", ownerId))
    .collect();

  await Promise.all(
    meanings.filter((m) => m.isPrimary).map((m) => ctx.db.patch(m._id, { isPrimary: false })),
  );
}

async function ensurePrimaryMeaningExists(ctx: MutationCtx, userId: string, ownerType: OwnerType, ownerId: string) {
  const meanings = await ctx.db
    .query("studyMeanings")
    .withIndex("by_user_owner", (q) => q.eq("userId", userId).eq("ownerType", ownerType).eq("ownerId", ownerId))
    .collect();
  if (meanings.length === 0) return;
  if (meanings.some((m) => m.isPrimary)) return;

  const sorted = meanings.sort((a, b) => a.order - b.order);
  await ctx.db.patch(sorted[0]!._id, { isPrimary: true });
}

async function loadMeanings(ctx: QueryCtx | MutationCtx, userId: string, ownerType: OwnerType, ownerId: string) {
  const meanings = await ctx.db
    .query("studyMeanings")
    .withIndex("by_user_owner", (q) => q.eq("userId", userId).eq("ownerType", ownerType).eq("ownerId", ownerId))
    .collect();
  meanings.sort((a, b) => a.order - b.order);
  return meanings;
}

async function loadNote(ctx: QueryCtx | MutationCtx, userId: string, ownerType: OwnerType, ownerId: string) {
  const notes = await ctx.db
    .query("studyNotes")
    .withIndex("by_user_owner", (q) => q.eq("userId", userId).eq("ownerType", ownerType).eq("ownerId", ownerId))
    .collect();
  return notes[0] ?? null; // We treat notes as “single note per entity”.
}

async function setNoteInternal(ctx: MutationCtx, userId: string, ownerType: OwnerType, ownerId: string, content: string) {
  await ensureOwnerExists(ctx, ownerType, ownerId, userId);

  const existing = await ctx.db
    .query("studyNotes")
    .withIndex("by_user_owner", (q) => q.eq("userId", userId).eq("ownerType", ownerType).eq("ownerId", ownerId))
    .collect();

  const now = Date.now();
  if (existing[0]) {
    await ctx.db.patch(existing[0]._id, { content, updatedAt: now });
    return existing[0]._id;
  }

  return ctx.db.insert("studyNotes", { userId, ownerType, ownerId, content, updatedAt: now });
}

async function clearNoteInternal(ctx: MutationCtx, userId: string, ownerType: OwnerType, ownerId: string) {
  await ensureOwnerExists(ctx, ownerType, ownerId, userId);

  const existing = await ctx.db
    .query("studyNotes")
    .withIndex("by_user_owner", (q) => q.eq("userId", userId).eq("ownerType", ownerType).eq("ownerId", ownerId))
    .collect();

  await Promise.all(existing.map((n) => ctx.db.delete(n._id)));
}

async function loadReferencesByMeaningIds(ctx: QueryCtx | MutationCtx, meaningIds: Id<"studyMeanings">[]) {
  const entries = await Promise.all(
    meaningIds.map(async (meaningId) => {
      const refs = await ctx.db.query("studyReferences").withIndex("by_meaning", (q) => q.eq("meaningId", meaningId)).collect();
      return [meaningId, refs] as const;
    }),
  );
  return new Map(entries);
}

// ---------------------------------------------------------------------------
// Compatibility API (vocab v1)
// ---------------------------------------------------------------------------

/**
 * Legacy vocabulary list query used by older UI widgets.
 * This remains temporarily to avoid breaking the dashboard while migrating.
 */
export const getVocab = query({
  args: { root: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getUserIdOrNull(ctx);
    if (!userId) return [];

    if (args.root) {
      return ctx.db
        .query("vocab")
        .withIndex("by_user_root", (q) => q.eq("userId", userId).eq("root", args.root!))
        .collect();
    }

    return ctx.db.query("vocab").withIndex("by_user_root", (q) => q.eq("userId", userId)).collect();
  },
});

/**
 * Legacy “add vocab” mutation. Prefer `createWord` going forward.
 */
export const addVocab = mutation({
  args: {
    arabicText: v.string(),
    transliteration: v.optional(v.string()),
    translation: v.string(),
    root: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    return ctx.db.insert("vocab", {
      ...args,
      userId: identity.subject,
      masteryLevel: 1,
      nextReview: Date.now(),
    });
  },
});

/**
 * Legacy review mutation. Prefer `reviewWord`.
 */
export const reviewVocab = mutation({
  args: { id: v.id("vocab"), masteryLevel: v.number() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const vocab = await ctx.db.get(args.id);
    if (!vocab || vocab.userId !== identity.subject) throw new Error("Unauthorized");

    const nextReview = computeNextReview(args.masteryLevel);
    await ctx.db.patch(args.id, { masteryLevel: args.masteryLevel, nextReview });
  },
});

// ---------------------------------------------------------------------------
// Migration (vocab -> studyWords + meanings)
// ---------------------------------------------------------------------------

export const migrateVocabToStudyWords = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);

    const existingWords = await ctx.db
      .query("studyWords")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const byKey = new Map<string, Id<"studyWords">>();
    for (const word of existingWords) {
      const key = `${word.arabicNormalized}|${word.root ?? ""}`;
      byKey.set(key, word._id);
    }

    const vocabRows = await ctx.db
      .query("vocab")
      .withIndex("by_user_root", (q) => q.eq("userId", identity.subject))
      .collect();

    let migrated = 0;
    for (const row of vocabRows) {
      if (row.migratedToWordId) continue;

      const normalized = normalizeArabic(row.arabicText);
      const key = `${normalized}|${row.root ?? ""}`;

      let wordId = byKey.get(key);
      if (!wordId) {
        wordId = await ctx.db.insert("studyWords", {
          userId: identity.subject,
          arabicText: row.arabicText,
          arabicNormalized: normalized,
          transliteration: row.transliteration,
          root: row.root,
          masteryLevel: row.masteryLevel ?? 1,
          nextReview: row.nextReview ?? Date.now(),
        });
        byKey.set(key, wordId);
      }

      const existingMeanings = await loadMeanings(ctx, identity.subject, "word", wordId);
      const shouldBePrimary = existingMeanings.length === 0;
      await ctx.db.insert("studyMeanings", {
        userId: identity.subject,
        ownerType: "word",
        ownerId: wordId,
        text: row.translation,
        language: "en",
        sourceId: undefined,
        isPrimary: shouldBePrimary,
        order: Date.now(),
      });

      await ctx.db.patch(row._id, { migratedToWordId: wordId });
      migrated += 1;
    }

    return { migrated };
  },
});

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export const listSources = query({
  args: { kind: v.optional(v.union(v.literal("quran_translation"), v.literal("tafsir"), v.literal("hadith"), v.literal("dictionary"), v.literal("other"))) },
  handler: async (ctx, args) => {
    const userId = await getUserIdOrNull(ctx);
    if (!userId) return [];

    const q = ctx.db.query("studySources").withIndex("by_user_kind", (idx) => idx.eq("userId", userId));
    const sources = await q.collect();
    const filtered = args.kind ? sources.filter((s) => s.kind === args.kind) : sources;
    filtered.sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));
    return filtered;
  },
});

export const upsertSource = mutation({
  args: {
    kind: v.union(v.literal("quran_translation"), v.literal("tafsir"), v.literal("hadith"), v.literal("dictionary"), v.literal("other")),
    title: v.optional(v.string()),
    url: v.optional(v.string()),
    author: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    const candidates = await ctx.db
      .query("studySources")
      .withIndex("by_user_kind", (q) => q.eq("userId", identity.subject).eq("kind", args.kind))
      .collect();

    const match = candidates.find((s) => (s.title ?? "") === (args.title ?? "") && (s.url ?? "") === (args.url ?? ""));
    const now = Date.now();

    if (match) {
      await ctx.db.patch(match._id, { author: args.author ?? match.author, lastUsedAt: now });
      return match._id;
    }

    return ctx.db.insert("studySources", {
      userId: identity.subject,
      kind: args.kind,
      title: args.title,
      url: args.url,
      author: args.author,
      lastUsedAt: now,
    });
  },
});

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

export const listWords = query({
  args: { root: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getUserIdOrNull(ctx);
    if (!userId) return [];

    const q = ctx.db.query("studyWords").withIndex("by_user", (idx) => idx.eq("userId", userId));
    const words = await q.collect();
    const filtered = args.root ? words.filter((w) => w.root === args.root) : words;
    filtered.sort((a, b) => b._creationTime - a._creationTime);
    return filtered;
  },
});

/**
 * Bulk data for client-side search (saved items only).
 *
 * We return all words/phrases/passages plus their meanings and sources so the
 * client can do:
 * - diacritics-insensitive Arabic matching using stored normalized fields
 * - fuzzy English matching across meaning text and source titles
 */
export const getStudySearchData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserIdOrNull(ctx);
    if (!userId) {
      return { words: [], phrases: [], verses: [], sources: [] };
    }

    const [words, phrases, verses, meanings, sources] = await Promise.all([
      ctx.db.query("studyWords").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("studyPhrases").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("studyQuranPassages").withIndex("by_user_surah", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("studyMeanings").withIndex("by_user_owner", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("studySources").withIndex("by_user_kind", (q) => q.eq("userId", userId)).collect(),
    ]);

    const byOwner = new Map<string, typeof meanings>();
    for (const m of meanings) {
      const key = `${m.ownerType}|${m.ownerId}`;
      const list = byOwner.get(key) ?? [];
      list.push(m);
      byOwner.set(key, list);
    }
    for (const [, list] of byOwner) {
      list.sort((a, b) => a.order - b.order);
    }

    return {
      words: words.map((word) => ({ word, meanings: byOwner.get(`word|${word._id}`) ?? [] })),
      phrases: phrases.map((phrase) => ({ phrase, meanings: byOwner.get(`phrase|${phrase._id}`) ?? [] })),
      verses: verses.map((passage) => ({ passage, meanings: byOwner.get(`quran_passage|${passage._id}`) ?? [] })),
      sources,
    };
  },
});

export const getWordDetail = query({
  args: { id: v.id("studyWords") },
  handler: async (ctx, args) => {
    const userId = await getUserIdOrNull(ctx);
    if (!userId) return null;

    const word = await ensureWordOwnership(ctx, args.id, userId);
    const meanings = await loadMeanings(ctx, userId, "word", word._id);
    const note = await loadNote(ctx, userId, "word", word._id);

    const links = await ctx.db
      .query("studyWordPhraseLinks")
      .withIndex("by_user_word", (q) => q.eq("userId", userId).eq("wordId", word._id))
      .collect();

    const phrases = await Promise.all(links.map((l) => ctx.db.get(l.phraseId)));
    const linkedPhrases = links
      .map((link, index) => ({ link, phrase: phrases[index] }))
      .filter((entry): entry is { link: typeof links[number]; phrase: NonNullable<typeof phrases[number]> } => Boolean(entry.phrase))
      .sort((a, b) => (a.link.order ?? 0) - (b.link.order ?? 0));

    const refsByMeaningId = await loadReferencesByMeaningIds(ctx, meanings.map((m) => m._id));

    return {
      word,
      meanings: meanings.map((meaning) => ({ meaning, references: refsByMeaningId.get(meaning._id) ?? [] })),
      note,
      linkedPhrases,
    };
  },
});

export const createWord = mutation({
  args: {
    arabicText: v.string(),
    transliteration: v.optional(v.string()),
    root: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    return ctx.db.insert("studyWords", {
      userId: identity.subject,
      arabicText: args.arabicText,
      arabicNormalized: normalizeArabic(args.arabicText),
      transliteration: args.transliteration,
      root: args.root,
      masteryLevel: 1,
      nextReview: Date.now(),
    });
  },
});

export const updateWord = mutation({
  args: {
    id: v.id("studyWords"),
    arabicText: v.optional(v.string()),
    transliteration: v.optional(v.union(v.string(), v.null())),
    root: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const word = await ensureWordOwnership(ctx, args.id, identity.subject);

    const patch: Record<string, unknown> = {};
    if (args.arabicText !== undefined) {
      patch.arabicText = args.arabicText;
      patch.arabicNormalized = normalizeArabic(args.arabicText);
    }
    if (args.transliteration !== undefined) patch.transliteration = args.transliteration ?? undefined;
    if (args.root !== undefined) patch.root = args.root ?? undefined;

    await ctx.db.patch(word._id, patch);
    return word._id;
  },
});

export const deleteWord = mutation({
  args: { id: v.id("studyWords") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const word = await ensureWordOwnership(ctx, args.id, identity.subject);

    const meanings = await loadMeanings(ctx, identity.subject, "word", word._id);
    for (const meaning of meanings) {
      const refs = await ctx.db.query("studyReferences").withIndex("by_meaning", (q) => q.eq("meaningId", meaning._id)).collect();
      await Promise.all(refs.map((r) => ctx.db.delete(r._id)));
      await ctx.db.delete(meaning._id);
    }

    const note = await loadNote(ctx, identity.subject, "word", word._id);
    if (note) await ctx.db.delete(note._id);

    const links = await ctx.db
      .query("studyWordPhraseLinks")
      .withIndex("by_user_word", (q) => q.eq("userId", identity.subject).eq("wordId", word._id))
      .collect();
    await Promise.all(links.map((l) => ctx.db.delete(l._id)));

    await ctx.db.delete(word._id);
  },
});

// ---------------------------------------------------------------------------
// Phrases
// ---------------------------------------------------------------------------

export const listPhrases = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserIdOrNull(ctx);
    if (!userId) return [];

    const phrases = await ctx.db.query("studyPhrases").withIndex("by_user", (idx) => idx.eq("userId", userId)).collect();
    phrases.sort((a, b) => b._creationTime - a._creationTime);
    return phrases;
  },
});

export const getPhraseDetail = query({
  args: { id: v.id("studyPhrases") },
  handler: async (ctx, args) => {
    const userId = await getUserIdOrNull(ctx);
    if (!userId) return null;

    const phrase = await ensurePhraseOwnership(ctx, args.id, userId);
    const meanings = await loadMeanings(ctx, userId, "phrase", phrase._id);
    const note = await loadNote(ctx, userId, "phrase", phrase._id);
    const refsByMeaningId = await loadReferencesByMeaningIds(ctx, meanings.map((m) => m._id));

    return {
      phrase,
      meanings: meanings.map((meaning) => ({ meaning, references: refsByMeaningId.get(meaning._id) ?? [] })),
      note,
    };
  },
});

export const createPhrase = mutation({
  args: { arabicText: v.string(), transliteration: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    return ctx.db.insert("studyPhrases", {
      userId: identity.subject,
      arabicText: args.arabicText,
      arabicNormalized: normalizeArabic(args.arabicText),
      transliteration: args.transliteration,
    });
  },
});

export const updatePhrase = mutation({
  args: {
    id: v.id("studyPhrases"),
    arabicText: v.optional(v.string()),
    transliteration: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const phrase = await ensurePhraseOwnership(ctx, args.id, identity.subject);

    const patch: Record<string, unknown> = {};
    if (args.arabicText !== undefined) {
      patch.arabicText = args.arabicText;
      patch.arabicNormalized = normalizeArabic(args.arabicText);
    }
    if (args.transliteration !== undefined) patch.transliteration = args.transliteration ?? undefined;

    await ctx.db.patch(phrase._id, patch);
    return phrase._id;
  },
});

export const deletePhrase = mutation({
  args: { id: v.id("studyPhrases") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const phrase = await ensurePhraseOwnership(ctx, args.id, identity.subject);

    const meanings = await loadMeanings(ctx, identity.subject, "phrase", phrase._id);
    for (const meaning of meanings) {
      const refs = await ctx.db.query("studyReferences").withIndex("by_meaning", (q) => q.eq("meaningId", meaning._id)).collect();
      await Promise.all(refs.map((r) => ctx.db.delete(r._id)));
      await ctx.db.delete(meaning._id);
    }

    const note = await loadNote(ctx, identity.subject, "phrase", phrase._id);
    if (note) await ctx.db.delete(note._id);

    const links = await ctx.db
      .query("studyWordPhraseLinks")
      .withIndex("by_user_phrase", (q) => q.eq("userId", identity.subject).eq("phraseId", phrase._id))
      .collect();
    await Promise.all(links.map((l) => ctx.db.delete(l._id)));

    await ctx.db.delete(phrase._id);
  },
});

// ---------------------------------------------------------------------------
// Quran passages (captures)
// ---------------------------------------------------------------------------

export const listQuranPassages = query({
  args: { surah: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getUserIdOrNull(ctx);
    if (!userId) return [];

    const passages = await ctx.db
      .query("studyQuranPassages")
      .withIndex("by_user_surah", (q) =>
        args.surah !== undefined ? q.eq("userId", userId).eq("surah", args.surah) : q.eq("userId", userId),
      )
      .collect();
    passages.sort((a, b) => b._creationTime - a._creationTime);
    return passages;
  },
});

export const getQuranPassageDetail = query({
  args: { id: v.id("studyQuranPassages") },
  handler: async (ctx, args) => {
    const userId = await getUserIdOrNull(ctx);
    if (!userId) return null;

    const passage = await ensurePassageOwnership(ctx, args.id, userId);
    const meanings = await loadMeanings(ctx, userId, "quran_passage", passage._id);
    const note = await loadNote(ctx, userId, "quran_passage", passage._id);
    const refsByMeaningId = await loadReferencesByMeaningIds(ctx, meanings.map((m) => m._id));

    return {
      passage,
      meanings: meanings.map((meaning) => ({ meaning, references: refsByMeaningId.get(meaning._id) ?? [] })),
      note,
    };
  },
});

export const createQuranPassage = mutation({
  args: { surah: v.number(), ayahStart: v.number(), ayahEnd: v.optional(v.number()), arabicText: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    validateQuranRange(args.surah, args.ayahStart, args.ayahEnd);
    return ctx.db.insert("studyQuranPassages", {
      userId: identity.subject,
      surah: args.surah,
      ayahStart: args.ayahStart,
      ayahEnd: args.ayahEnd,
      arabicText: args.arabicText,
      arabicNormalized: normalizeArabic(args.arabicText),
    });
  },
});

export const updateQuranPassage = mutation({
  args: {
    id: v.id("studyQuranPassages"),
    surah: v.optional(v.number()),
    ayahStart: v.optional(v.number()),
    ayahEnd: v.optional(v.union(v.number(), v.null())),
    arabicText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const passage = await ensurePassageOwnership(ctx, args.id, identity.subject);

    const nextSurah = args.surah ?? passage.surah;
    const nextAyahStart = args.ayahStart ?? passage.ayahStart;
    const nextAyahEnd = args.ayahEnd === undefined ? passage.ayahEnd : args.ayahEnd ?? undefined;
    validateQuranRange(nextSurah, nextAyahStart, nextAyahEnd);

    const patch: Record<string, unknown> = {};
    if (args.surah !== undefined) patch.surah = args.surah;
    if (args.ayahStart !== undefined) patch.ayahStart = args.ayahStart;
    if (args.ayahEnd !== undefined) patch.ayahEnd = args.ayahEnd ?? undefined;
    if (args.arabicText !== undefined) {
      patch.arabicText = args.arabicText;
      patch.arabicNormalized = normalizeArabic(args.arabicText);
    }

    await ctx.db.patch(passage._id, patch);
    return passage._id;
  },
});

export const deleteQuranPassage = mutation({
  args: { id: v.id("studyQuranPassages") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const passage = await ensurePassageOwnership(ctx, args.id, identity.subject);

    const meanings = await loadMeanings(ctx, identity.subject, "quran_passage", passage._id);
    for (const meaning of meanings) {
      const refs = await ctx.db.query("studyReferences").withIndex("by_meaning", (q) => q.eq("meaningId", meaning._id)).collect();
      await Promise.all(refs.map((r) => ctx.db.delete(r._id)));
      await ctx.db.delete(meaning._id);
    }

    const note = await loadNote(ctx, identity.subject, "quran_passage", passage._id);
    if (note) await ctx.db.delete(note._id);

    await ctx.db.delete(passage._id);
  },
});

/**
 * Returns saved Quran passage captures that overlap a Quran reference range.
 * Used by the UI to “auto show my saved verse capture” when viewing references.
 */
export const findOverlappingQuranCaptures = query({
  args: { surah: v.number(), ayahStart: v.number(), ayahEnd: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getUserIdOrNull(ctx);
    if (!userId) return [];

    validateQuranRange(args.surah, args.ayahStart, args.ayahEnd);

    const captures = await ctx.db
      .query("studyQuranPassages")
      .withIndex("by_user_surah", (q) => q.eq("userId", userId).eq("surah", args.surah))
      .collect();

    const refStart = args.ayahStart;
    const refEnd = args.ayahEnd ?? args.ayahStart;

    return captures.filter((c) => {
      const cStart = c.ayahStart;
      const cEnd = c.ayahEnd ?? c.ayahStart;
      return cStart <= refEnd && refStart <= cEnd;
    });
  },
});

/**
 * Batch version of `findOverlappingQuranCaptures`.
 *
 * This is used by detail views so we can:
 * - avoid calling a query hook inside a render loop
 * - still keep overlap logic on the backend (single source of truth)
 */
export const findOverlappingQuranCapturesBatch = query({
  args: {
    refs: v.array(
      v.object({
        refId: v.string(),
        surah: v.number(),
        ayahStart: v.number(),
        ayahEnd: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getUserIdOrNull(ctx);
    if (!userId) return {};
    if (args.refs.length === 0) return {};

    // Group references by surah to minimize DB reads.
    const bySurah = new Map<number, { refId: string; ayahStart: number; ayahEnd?: number }[]>();
    for (const ref of args.refs) {
      validateQuranRange(ref.surah, ref.ayahStart, ref.ayahEnd);
      const list = bySurah.get(ref.surah) ?? [];
      list.push({ refId: ref.refId, ayahStart: ref.ayahStart, ayahEnd: ref.ayahEnd });
      bySurah.set(ref.surah, list);
    }

    const result: Record<string, Doc<"studyQuranPassages">[]> = {};

    for (const [surah, refs] of bySurah.entries()) {
      const captures = await ctx.db
        .query("studyQuranPassages")
        .withIndex("by_user_surah", (q) => q.eq("userId", userId).eq("surah", surah))
        .collect();

      for (const ref of refs) {
        const refStart = ref.ayahStart;
        const refEnd = ref.ayahEnd ?? refStart;
        result[ref.refId] = captures.filter((c) => {
          const cStart = c.ayahStart;
          const cEnd = c.ayahEnd ?? c.ayahStart;
          return cStart <= refEnd && refStart <= cEnd;
        });
      }
    }

    return result;
  },
});

// ---------------------------------------------------------------------------
// Meanings
// ---------------------------------------------------------------------------

export const createMeaning = mutation({
  args: {
    ownerType: v.union(v.literal("word"), v.literal("phrase"), v.literal("quran_passage")),
    ownerId: v.string(),
    text: v.string(),
    language: v.optional(v.string()),
    sourceId: v.optional(v.id("studySources")),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureOwnerExists(ctx, args.ownerType, args.ownerId, identity.subject);

    const shouldBePrimary = args.isPrimary ?? false;
    if (shouldBePrimary) await unsetOtherPrimaryMeanings(ctx, identity.subject, args.ownerType, args.ownerId);

    const meaningId = await ctx.db.insert("studyMeanings", {
      userId: identity.subject,
      ownerType: args.ownerType,
      ownerId: args.ownerId,
      text: args.text,
      language: args.language,
      sourceId: args.sourceId,
      isPrimary: shouldBePrimary,
      order: Date.now(),
    });

    await ensurePrimaryMeaningExists(ctx, identity.subject, args.ownerType, args.ownerId);
    return meaningId;
  },
});

export const updateMeaning = mutation({
  args: {
    id: v.id("studyMeanings"),
    text: v.optional(v.string()),
    language: v.optional(v.union(v.string(), v.null())),
    sourceId: v.optional(v.union(v.id("studySources"), v.null())),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const meaning = await ctx.db.get(args.id);
    if (!meaning || meaning.userId !== identity.subject) throw new Error("Meaning not found");

    if (args.isPrimary === true) {
      await unsetOtherPrimaryMeanings(ctx, identity.subject, meaning.ownerType, meaning.ownerId);
    }

    const patch: Record<string, unknown> = {};
    if (args.text !== undefined) patch.text = args.text;
    if (args.language !== undefined) patch.language = args.language ?? undefined;
    if (args.sourceId !== undefined) patch.sourceId = args.sourceId ?? undefined;
    if (args.isPrimary !== undefined) patch.isPrimary = args.isPrimary;

    await ctx.db.patch(meaning._id, patch);
    await ensurePrimaryMeaningExists(ctx, identity.subject, meaning.ownerType, meaning.ownerId);
  },
});

export const deleteMeaning = mutation({
  args: { id: v.id("studyMeanings") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const meaning = await ctx.db.get(args.id);
    if (!meaning || meaning.userId !== identity.subject) throw new Error("Meaning not found");

    const refs = await ctx.db.query("studyReferences").withIndex("by_meaning", (q) => q.eq("meaningId", meaning._id)).collect();
    await Promise.all(refs.map((r) => ctx.db.delete(r._id)));

    await ctx.db.delete(meaning._id);
    await ensurePrimaryMeaningExists(ctx, identity.subject, meaning.ownerType, meaning.ownerId);
  },
});

// ---------------------------------------------------------------------------
// References (attached to meanings)
// ---------------------------------------------------------------------------

export const createReference = mutation({
  args: {
    meaningId: v.id("studyMeanings"),
    type: v.union(v.literal("quran"), v.literal("hadith"), v.literal("other")),

    quranSurah: v.optional(v.number()),
    quranAyahStart: v.optional(v.number()),
    quranAyahEnd: v.optional(v.number()),

    hadithCollection: v.optional(v.string()),
    hadithNumber: v.optional(v.string()),
    hadithBook: v.optional(v.string()),
    hadithChapter: v.optional(v.string()),
    hadithGrade: v.optional(v.string()),
    hadithNarrator: v.optional(v.string()),

    title: v.optional(v.string()),
    url: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const meaning = await ctx.db.get(args.meaningId);
    if (!meaning || meaning.userId !== identity.subject) throw new Error("Meaning not found");

    // Validate required fields based on reference type.
    if (args.type === "quran") {
      if (args.quranSurah === undefined || args.quranAyahStart === undefined) {
        throw new Error("Quran reference requires surah and ayahStart");
      }
      validateQuranRange(args.quranSurah, args.quranAyahStart, args.quranAyahEnd);
    }
    if (args.type === "hadith") {
      if (!args.hadithCollection || !args.hadithNumber) {
        throw new Error("Hadith reference requires collection and hadithNumber");
      }
    }

    return ctx.db.insert("studyReferences", {
      userId: identity.subject,
      meaningId: args.meaningId,
      type: args.type,

      quranSurah: args.type === "quran" ? args.quranSurah : undefined,
      quranAyahStart: args.type === "quran" ? args.quranAyahStart : undefined,
      quranAyahEnd: args.type === "quran" ? args.quranAyahEnd : undefined,

      hadithCollection: args.type === "hadith" ? args.hadithCollection : undefined,
      hadithNumber: args.type === "hadith" ? args.hadithNumber : undefined,
      hadithBook: args.type === "hadith" ? args.hadithBook : undefined,
      hadithChapter: args.type === "hadith" ? args.hadithChapter : undefined,
      hadithGrade: args.type === "hadith" ? args.hadithGrade : undefined,
      hadithNarrator: args.type === "hadith" ? args.hadithNarrator : undefined,

      title: args.title,
      url: args.url,
      notes: args.notes,
    });
  },
});

export const updateReference = mutation({
  args: {
    id: v.id("studyReferences"),
    type: v.optional(v.union(v.literal("quran"), v.literal("hadith"), v.literal("other"))),

    quranSurah: v.optional(v.union(v.number(), v.null())),
    quranAyahStart: v.optional(v.union(v.number(), v.null())),
    quranAyahEnd: v.optional(v.union(v.number(), v.null())),

    hadithCollection: v.optional(v.union(v.string(), v.null())),
    hadithNumber: v.optional(v.union(v.string(), v.null())),
    hadithBook: v.optional(v.union(v.string(), v.null())),
    hadithChapter: v.optional(v.union(v.string(), v.null())),
    hadithGrade: v.optional(v.union(v.string(), v.null())),
    hadithNarrator: v.optional(v.union(v.string(), v.null())),

    title: v.optional(v.union(v.string(), v.null())),
    url: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const ref = await ctx.db.get(args.id);
    if (!ref || ref.userId !== identity.subject) throw new Error("Reference not found");

    const nextType: ReferenceType = (args.type ?? ref.type) as ReferenceType;

    const quranSurah = args.quranSurah === undefined ? ref.quranSurah : args.quranSurah ?? undefined;
    const quranAyahStart = args.quranAyahStart === undefined ? ref.quranAyahStart : args.quranAyahStart ?? undefined;
    const quranAyahEnd = args.quranAyahEnd === undefined ? ref.quranAyahEnd : args.quranAyahEnd ?? undefined;

    const hadithCollection =
      args.hadithCollection === undefined ? ref.hadithCollection : args.hadithCollection ?? undefined;
    const hadithNumber = args.hadithNumber === undefined ? ref.hadithNumber : args.hadithNumber ?? undefined;

    if (nextType === "quran") {
      if (quranSurah === undefined || quranAyahStart === undefined) throw new Error("Quran reference requires surah and ayahStart");
      validateQuranRange(quranSurah, quranAyahStart, quranAyahEnd);
    }
    if (nextType === "hadith") {
      if (!hadithCollection || !hadithNumber) throw new Error("Hadith reference requires collection and hadithNumber");
    }

    const patch: Record<string, unknown> = { type: nextType };
    if (nextType === "quran") {
      patch.quranSurah = quranSurah;
      patch.quranAyahStart = quranAyahStart;
      patch.quranAyahEnd = quranAyahEnd;
      patch.hadithCollection = undefined;
      patch.hadithNumber = undefined;
      patch.hadithBook = undefined;
      patch.hadithChapter = undefined;
      patch.hadithGrade = undefined;
      patch.hadithNarrator = undefined;
    } else if (nextType === "hadith") {
      patch.hadithCollection = hadithCollection;
      patch.hadithNumber = hadithNumber;
      patch.hadithBook = args.hadithBook === undefined ? ref.hadithBook : args.hadithBook ?? undefined;
      patch.hadithChapter = args.hadithChapter === undefined ? ref.hadithChapter : args.hadithChapter ?? undefined;
      patch.hadithGrade = args.hadithGrade === undefined ? ref.hadithGrade : args.hadithGrade ?? undefined;
      patch.hadithNarrator = args.hadithNarrator === undefined ? ref.hadithNarrator : args.hadithNarrator ?? undefined;
      patch.quranSurah = undefined;
      patch.quranAyahStart = undefined;
      patch.quranAyahEnd = undefined;
    } else {
      patch.quranSurah = undefined;
      patch.quranAyahStart = undefined;
      patch.quranAyahEnd = undefined;
      patch.hadithCollection = undefined;
      patch.hadithNumber = undefined;
      patch.hadithBook = undefined;
      patch.hadithChapter = undefined;
      patch.hadithGrade = undefined;
      patch.hadithNarrator = undefined;
    }

    if (args.title !== undefined) patch.title = args.title ?? undefined;
    if (args.url !== undefined) patch.url = args.url ?? undefined;
    if (args.notes !== undefined) patch.notes = args.notes ?? undefined;

    await ctx.db.patch(ref._id, patch);
  },
});

export const deleteReference = mutation({
  args: { id: v.id("studyReferences") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const ref = await ctx.db.get(args.id);
    if (!ref || ref.userId !== identity.subject) throw new Error("Reference not found");
    await ctx.db.delete(ref._id);
  },
});

// ---------------------------------------------------------------------------
// Notes (single note per entity)
// ---------------------------------------------------------------------------

export const setNote = mutation({
  args: { ownerType: v.union(v.literal("word"), v.literal("phrase"), v.literal("quran_passage")), ownerId: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    return setNoteInternal(ctx, identity.subject, args.ownerType, args.ownerId, args.content);
  },
});

export const clearNote = mutation({
  args: { ownerType: v.union(v.literal("word"), v.literal("phrase"), v.literal("quran_passage")), ownerId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await clearNoteInternal(ctx, identity.subject, args.ownerType, args.ownerId);
  },
});

/**
 * CRUD-friendly aliases for notes (some UI may prefer explicit verb names).
 * Internally notes are treated as “single note per entity”, so create/update
 * both map to `setNote`.
 */
export const createNote = mutation({
  args: { ownerType: v.union(v.literal("word"), v.literal("phrase"), v.literal("quran_passage")), ownerId: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    return setNoteInternal(ctx, identity.subject, args.ownerType, args.ownerId, args.content);
  },
});

export const updateNote = mutation({
  args: { ownerType: v.union(v.literal("word"), v.literal("phrase"), v.literal("quran_passage")), ownerId: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    return setNoteInternal(ctx, identity.subject, args.ownerType, args.ownerId, args.content);
  },
});

export const deleteNote = mutation({
  args: { ownerType: v.union(v.literal("word"), v.literal("phrase"), v.literal("quran_passage")), ownerId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await clearNoteInternal(ctx, identity.subject, args.ownerType, args.ownerId);
  },
});

// ---------------------------------------------------------------------------
// Word <-> phrase example links
// ---------------------------------------------------------------------------

export const linkWordToPhrase = mutation({
  args: { wordId: v.id("studyWords"), phraseId: v.id("studyPhrases"), order: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureWordOwnership(ctx, args.wordId, identity.subject);
    await ensurePhraseOwnership(ctx, args.phraseId, identity.subject);

    const existing = await ctx.db
      .query("studyWordPhraseLinks")
      .withIndex("by_user_word", (q) => q.eq("userId", identity.subject).eq("wordId", args.wordId))
      .collect();
    const already = existing.find((l) => l.phraseId === args.phraseId);
    if (already) return already._id;

    return ctx.db.insert("studyWordPhraseLinks", {
      userId: identity.subject,
      wordId: args.wordId,
      phraseId: args.phraseId,
      order: args.order,
    });
  },
});

export const unlinkWordToPhrase = mutation({
  args: { wordId: v.id("studyWords"), phraseId: v.id("studyPhrases") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureWordOwnership(ctx, args.wordId, identity.subject);
    await ensurePhraseOwnership(ctx, args.phraseId, identity.subject);

    const links = await ctx.db
      .query("studyWordPhraseLinks")
      .withIndex("by_user_word", (q) => q.eq("userId", identity.subject).eq("wordId", args.wordId))
      .collect();
    const match = links.find((l) => l.phraseId === args.phraseId);
    if (match) await ctx.db.delete(match._id);
  },
});

// ---------------------------------------------------------------------------
// Review (flashcards)
// ---------------------------------------------------------------------------

export const listWordsForFlashcards = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserIdOrNull(ctx);
    if (!userId) return [];

    const words = await ctx.db.query("studyWords").withIndex("by_user", (q) => q.eq("userId", userId)).collect();

    // For flashcards we keep it minimal: Arabic word + primary meaning.
    const meanings = await ctx.db
      .query("studyMeanings")
      .withIndex("by_user_owner", (q) => q.eq("userId", userId).eq("ownerType", "word"))
      .collect();

    const byWord = new Map<string, { text: string; isPrimary: boolean; order: number }[]>();
    for (const m of meanings) {
      const list = byWord.get(m.ownerId) ?? [];
      list.push({ text: m.text, isPrimary: m.isPrimary, order: m.order });
      byWord.set(m.ownerId, list);
    }

    const now = Date.now();
    const due = words.filter((w) => (w.nextReview ?? 0) <= now);
    due.sort((a, b) => (a.nextReview ?? 0) - (b.nextReview ?? 0));

    return due.map((word) => {
      const ms = (byWord.get(word._id) ?? []).sort((a, b) => a.order - b.order);
      const primary = ms.find((m) => m.isPrimary) ?? ms[0];
      return { word, primaryMeaning: primary?.text ?? "" };
    });
  },
});

/**
 * Small dashboard-friendly “recent words” query.
 *
 * Keeps `app/_components/RecentVocab.tsx` fast without pulling the entire search dataset.
 */
export const listRecentWords = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getUserIdOrNull(ctx);
    if (!userId) return [];

    const limit = Math.max(1, Math.min(20, args.limit ?? 5));

    const words = await ctx.db.query("studyWords").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    words.sort((a, b) => b._creationTime - a._creationTime);
    const recent = words.slice(0, limit);

    const meanings = await ctx.db
      .query("studyMeanings")
      .withIndex("by_user_owner", (q) => q.eq("userId", userId).eq("ownerType", "word"))
      .collect();

    const byWord = new Map<string, { text: string; isPrimary: boolean; order: number }[]>();
    for (const m of meanings) {
      const list = byWord.get(m.ownerId) ?? [];
      list.push({ text: m.text, isPrimary: m.isPrimary, order: m.order });
      byWord.set(m.ownerId, list);
    }

    return recent.map((word) => {
      const ms = (byWord.get(word._id) ?? []).sort((a, b) => a.order - b.order);
      const primary = ms.find((m) => m.isPrimary) ?? ms[0];
      return { word, primaryMeaning: primary?.text ?? "" };
    });
  },
});

export const reviewWord = mutation({
  args: { id: v.id("studyWords"), masteryLevel: v.number() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const word = await ensureWordOwnership(ctx, args.id, identity.subject);
    const masteryLevel = Math.max(1, Math.min(5, args.masteryLevel));
    const nextReview = computeNextReview(masteryLevel);
    await ctx.db.patch(word._id, { masteryLevel, nextReview });
  },
});
