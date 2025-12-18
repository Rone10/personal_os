'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { StudySearchBar } from './StudySearchBar';
import { StudyList } from './StudyList';
import { WordDetail } from './WordDetail';
import { PhraseDetail } from './PhraseDetail';
import { QuranPassageDetail } from './QuranPassageDetail';
import { WordFormDialog } from './WordFormDialog';
import { PhraseFormDialog } from './PhraseFormDialog';
import { QuranPassageFormDialog } from './QuranPassageFormDialog';
import { containsArabic, normalizeArabic } from '@/lib/arabic';
import { fuzzyScore } from '@/lib/fuzzy';
import { StudyFlashcards } from './StudyFlashcards';

type StudyType = 'word' | 'phrase' | 'verse';

function buildAyahRange(ayahStart: number, ayahEnd?: number) {
  if (!ayahEnd || ayahEnd === ayahStart) return `${ayahStart}`;
  return `${ayahStart}–${ayahEnd}`;
}

const EMPTY_SEARCH_DATA = {
  words: [],
  phrases: [],
  verses: [],
  sources: [],
} as const;

/**
 * Full Study Center UI (Client Component).
 *
 * Uses URL search params for routing state:
 * - `type`: word | phrase | verse
 * - `id`: selected entity id
 * - `q`: search query
 * - `new=true`: command palette shortcut to open “Add Word”
 */
export default function StudyPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedType = (searchParams.get('type') as StudyType | null) ?? 'word';
  const selectedId = searchParams.get('id');
  const queryText = searchParams.get('q') ?? '';
  const newParam = searchParams.get('new') === 'true';

  const searchData = useQuery(api.study.getStudySearchData, {});

  // Legacy vocab used only to offer a one-click migration for existing users.
  const legacyVocab = useQuery(api.study.getVocab, {});
  const migrate = useMutation(api.study.migrateVocabToStudyWords);

  const [isMigrating, setIsMigrating] = useState(false);
  const [isWordDialogOpen, setIsWordDialogOpen] = useState(false);
  const [isPhraseDialogOpen, setIsPhraseDialogOpen] = useState(false);
  const [isVerseDialogOpen, setIsVerseDialogOpen] = useState(false);
  const [view, setView] = useState<'library' | 'flashcards'>('library');

  const isLoading = searchData === undefined || legacyVocab === undefined;
  const resolved = searchData ?? EMPTY_SEARCH_DATA;
  const words = resolved.words;
  const phrases = resolved.phrases;
  const verses = resolved.verses;
  const sources = resolved.sources;
  const legacy = legacyVocab ?? [];

  const needsMigration = legacy.length > 0 && words.length === 0;

  const sourcesById = useMemo(() => {
    const map = new Map<string, (typeof sources)[number]>();
    sources.forEach((s) => map.set(s._id, s));
    return map;
  }, [sources]);

  const listItems = useMemo(() => {
    if (selectedType === 'word') {
      return words.map(({ word, meanings }) => {
        const primary = meanings.find((m) => m.isPrimary) ?? meanings[0];
        return {
          id: word._id,
          title: word.arabicText,
          subtitle: primary?.text ?? '',
          meta: word.root ?? undefined,
          isArabic: true,
          arabicNormalized: word.arabicNormalized,
          englishCorpus: [
            ...meanings.map((m) => m.text),
            ...meanings
              .map((m) => (m.sourceId ? sourcesById.get(m.sourceId)?.title ?? '' : ''))
              .filter(Boolean),
          ].join(' | '),
          createdAt: word._creationTime,
          root: word.root ?? '',
        };
      });
    }
    if (selectedType === 'phrase') {
      return phrases.map(({ phrase, meanings }) => {
        const primary = meanings.find((m) => m.isPrimary) ?? meanings[0];
        return {
          id: phrase._id,
          title: phrase.arabicText,
          subtitle: primary?.text ?? '',
          isArabic: true,
          arabicNormalized: phrase.arabicNormalized,
          englishCorpus: [
            ...meanings.map((m) => m.text),
            ...meanings
              .map((m) => (m.sourceId ? sourcesById.get(m.sourceId)?.title ?? '' : ''))
              .filter(Boolean),
          ].join(' | '),
          createdAt: phrase._creationTime,
        };
      });
    }

    return verses.map(({ passage, meanings }) => {
      const primary = meanings.find((m) => m.isPrimary) ?? meanings[0];
      return {
        id: passage._id,
        title: `${passage.surah}:${buildAyahRange(passage.ayahStart, passage.ayahEnd)}`,
        subtitle: primary?.text ?? '',
        meta: 'Quran',
        isArabic: false,
        arabicNormalized: passage.arabicNormalized,
        englishCorpus: [
          ...meanings.map((m) => m.text),
          ...meanings
            .map((m) => (m.sourceId ? sourcesById.get(m.sourceId)?.title ?? '' : ''))
            .filter(Boolean),
        ].join(' | '),
        createdAt: passage._creationTime,
      };
    });
  }, [phrases, selectedType, sourcesById, verses, words]);

  const setParams = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(searchParams.toString());
      Object.entries(next).forEach(([key, value]) => {
        if (value === null) sp.delete(key);
        else sp.set(key, value);
      });
      router.replace(`/study?${sp.toString()}`);
    },
    [router, searchParams]
  );

  // Support the Command Palette “Add Vocab” shortcut, which navigates to /study?new=true.
  // We keep the behavior minimal: open “Add Word” and then remove the `new` param.
  useEffect(() => {
    if (!newParam) return;
    setIsWordDialogOpen(true);
    setParams({ new: null });
  }, [newParam, setParams]);

  const filteredItems = useMemo(() => {
    const q = queryText.trim();
    if (!q) return listItems;

    const isArabicQuery = containsArabic(q);
    const qArabic = normalizeArabic(q);
    const qLower = q.toLowerCase();

    const scored = listItems
      .map((item) => {
        let score = 0;

        // Arabic: diacritics-insensitive substring matching on stored normalized text.
        if (isArabicQuery && item.arabicNormalized) {
          if (item.arabicNormalized === qArabic) score = Math.max(score, 120);
          else if (item.arabicNormalized.startsWith(qArabic)) score = Math.max(score, 110);
          else if (item.arabicNormalized.includes(qArabic)) score = Math.max(score, 100);
        }

        // Root: exact match for word roots (quick filtering).
        if (selectedType === 'word' && 'root' in item && item.root && item.root.toLowerCase() === qLower) {
          score = Math.max(score, 105);
        }

        // English: fuzzy match across meaning text and source titles.
        if (item.englishCorpus) {
          score += fuzzyScore(q, item.englishCorpus) * 60;
        }

        return { ...item, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => (b.score !== a.score ? b.score - a.score : b.createdAt - a.createdAt));

    return scored;
  }, [listItems, queryText, selectedType]);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Center</h1>
          <p className="text-muted-foreground">
            Capture words, phrases, and Quran passages with meanings, references, and your own notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsPhraseDialogOpen(true)}>
            Add Phrase
          </Button>
          <Button variant="outline" onClick={() => setIsVerseDialogOpen(true)}>
            Add Verse
          </Button>
          <Button onClick={() => setIsWordDialogOpen(true)}>Add Word</Button>
        </div>
      </div>

      {needsMigration ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100 p-4 flex items-center justify-between gap-4">
          <div className="text-sm">
            Found legacy vocab entries. Migrate them to the new Study model to use meanings, references, and verse captures.
          </div>
          <Button
            variant="outline"
            disabled={isMigrating}
            onClick={async () => {
              setIsMigrating(true);
              try {
                await migrate({});
              } finally {
                setIsMigrating(false);
              }
            }}
          >
            {isMigrating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Migrate
          </Button>
        </div>
      ) : null}

      <Tabs value={view} onValueChange={(v) => setView(v as 'library' | 'flashcards')} className="space-y-6">
        <TabsList>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-6">
          <Tabs value={selectedType} onValueChange={(v) => setParams({ type: v, id: null })}>
            <TabsList>
              <TabsTrigger value="word">Words</TabsTrigger>
              <TabsTrigger value="phrase">Phrases</TabsTrigger>
              <TabsTrigger value="verse">Verses</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-6">
            <div className="space-y-4">
              <StudySearchBar value={queryText} onChange={(next) => setParams({ q: next || null })} />
              <StudyList items={filteredItems} selectedId={selectedId} onSelect={(id) => setParams({ id })} />
            </div>

            <div className="min-h-[420px]">
              {selectedType === 'word' && selectedId ? <WordDetail id={selectedId} /> : null}
              {selectedType === 'phrase' && selectedId ? <PhraseDetail id={selectedId} /> : null}
              {selectedType === 'verse' && selectedId ? <QuranPassageDetail id={selectedId} /> : null}
              {!selectedId ? (
                <div className="h-full rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500">
                  Select an item to view details.
                </div>
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="flashcards">
          <StudyFlashcards />
        </TabsContent>
      </Tabs>

      <WordFormDialog
        open={isWordDialogOpen}
        onOpenChange={setIsWordDialogOpen}
        onCreated={(wordId) => setParams({ type: 'word', id: wordId })}
      />
      <PhraseFormDialog
        open={isPhraseDialogOpen}
        onOpenChange={setIsPhraseDialogOpen}
        onCreated={(phraseId) => setParams({ type: 'phrase', id: phraseId })}
      />
      <QuranPassageFormDialog
        open={isVerseDialogOpen}
        onOpenChange={setIsVerseDialogOpen}
        onCreated={(passageId) => setParams({ type: 'verse', id: passageId })}
      />
    </div>
  );
}

