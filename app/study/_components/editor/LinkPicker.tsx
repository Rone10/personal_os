"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Languages, ScrollText, BookOpen, Hash, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReferenceType = "word" | "verse" | "hadith" | "root" | "lesson" | "chapter";

export interface SelectedReference {
  type: ReferenceType;
  id: string;
  displayText: string;
}

interface LinkPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (ref: SelectedReference) => void;
}

export default function LinkPicker({ open, onClose, onSelect }: LinkPickerProps) {
  const [activeTab, setActiveTab] = useState<ReferenceType>("word");
  const [search, setSearch] = useState("");

  // Fetch all entity types
  const words = useQuery(api.study.words.list, {});
  const verses = useQuery(api.study.verses.list, {});
  const hadiths = useQuery(api.study.hadiths.list, {});
  const roots = useQuery(api.study.roots.list);
  // Note: courses/books/lessons/chapters would require additional API calls
  // For now, LinkPicker only supports word, verse, hadith, and root references

  // Reset search when tab changes
  useEffect(() => {
    setSearch("");
  }, [activeTab]);

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase().trim();

    switch (activeTab) {
      case "word":
        return (words ?? []).filter(w =>
          w.text.includes(search) ||
          w.transliteration?.toLowerCase().includes(query) ||
          w.meanings.some(m => m.definition.toLowerCase().includes(query))
        ).slice(0, 20);
      case "verse":
        return (verses ?? []).filter(v =>
          v.arabicText.includes(search) ||
          `${v.surahNumber}:${v.ayahStart}`.includes(query)
        ).slice(0, 20);
      case "hadith":
        return (hadiths ?? []).filter(h =>
          h.arabicText.includes(search) ||
          h.collection.toLowerCase().includes(query) ||
          h.hadithNumber.includes(query)
        ).slice(0, 20);
      case "root":
        return (roots ?? []).filter(r =>
          r.letters.includes(search) ||
          r.latinized.toLowerCase().includes(query) ||
          r.coreMeaning.toLowerCase().includes(query)
        ).slice(0, 20);
      default:
        return [];
    }
  }, [activeTab, search, words, verses, hadiths, roots]);

  const handleSelect = (item: unknown) => {
    let displayText = "";
    let id = "";

    switch (activeTab) {
      case "word": {
        const word = item as { _id: string; text: string };
        displayText = word.text;
        id = word._id;
        break;
      }
      case "verse": {
        const verse = item as { _id: string; surahNumber: number; ayahStart: number; ayahEnd?: number };
        displayText = verse.ayahEnd
          ? `[${verse.surahNumber}:${verse.ayahStart}-${verse.ayahEnd}]`
          : `[${verse.surahNumber}:${verse.ayahStart}]`;
        id = verse._id;
        break;
      }
      case "hadith": {
        const hadith = item as { _id: string; collection: string; hadithNumber: string };
        displayText = `[${hadith.collection} #${hadith.hadithNumber}]`;
        id = hadith._id;
        break;
      }
      case "root": {
        const root = item as { _id: string; letters: string };
        displayText = `[${root.letters}]`;
        id = root._id;
        break;
      }
    }

    onSelect({ type: activeTab, id, displayText });
    onClose();
  };

  const tabIcons: Record<ReferenceType, React.ReactNode> = {
    word: <Languages className="h-4 w-4" />,
    verse: <BookOpen className="h-4 w-4" />,
    hadith: <ScrollText className="h-4 w-4" />,
    root: <Hash className="h-4 w-4" />,
    lesson: <Link2 className="h-4 w-4" />,
    chapter: <Link2 className="h-4 w-4" />,
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Insert Reference
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReferenceType)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="word" className="flex items-center gap-1">
                {tabIcons.word}
                <span className="hidden sm:inline">Word</span>
              </TabsTrigger>
              <TabsTrigger value="verse" className="flex items-center gap-1">
                {tabIcons.verse}
                <span className="hidden sm:inline">Verse</span>
              </TabsTrigger>
              <TabsTrigger value="hadith" className="flex items-center gap-1">
                {tabIcons.hadith}
                <span className="hidden sm:inline">Hadith</span>
              </TabsTrigger>
              <TabsTrigger value="root" className="flex items-center gap-1">
                {tabIcons.root}
                <span className="hidden sm:inline">Root</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <Input
            placeholder={`Search ${activeTab}s...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto border rounded-lg">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                {words === undefined || verses === undefined || hadiths === undefined || roots === undefined ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  <p>No results found</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredItems.map((item, idx) => (
                  <button
                    key={idx}
                    className={cn(
                      "w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50",
                      "focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/50"
                    )}
                    onClick={() => handleSelect(item)}
                  >
                    {activeTab === "word" && (
                      <WordItem word={item as { text: string; transliteration?: string; meanings: Array<{ definition: string }> }} />
                    )}
                    {activeTab === "verse" && (
                      <VerseItem verse={item as { surahNumber: number; ayahStart: number; ayahEnd?: number; arabicText: string }} />
                    )}
                    {activeTab === "hadith" && (
                      <HadithItem hadith={item as { collection: string; hadithNumber: string; arabicText: string }} />
                    )}
                    {activeTab === "root" && (
                      <RootItem root={item as { letters: string; latinized: string; coreMeaning: string }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 text-center">
            Press Enter to select, Escape to cancel
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WordItem({ word }: { word: { text: string; transliteration?: string; meanings: Array<{ definition: string }> } }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="font-arabic text-lg">{word.text}</span>
        {word.transliteration && (
          <span className="text-sm text-slate-400">({word.transliteration})</span>
        )}
      </div>
      {word.meanings[0] && (
        <p className="text-sm text-slate-500 truncate">{word.meanings[0].definition}</p>
      )}
    </div>
  );
}

function VerseItem({ verse }: { verse: { surahNumber: number; ayahStart: number; ayahEnd?: number; arabicText: string } }) {
  return (
    <div>
      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
        {verse.surahNumber}:{verse.ayahStart}
        {verse.ayahEnd && verse.ayahEnd !== verse.ayahStart && `-${verse.ayahEnd}`}
      </span>
      <p className="font-arabic text-sm truncate mt-1" dir="rtl">
        {verse.arabicText.slice(0, 100)}...
      </p>
    </div>
  );
}

function HadithItem({ hadith }: { hadith: { collection: string; hadithNumber: string; arabicText: string } }) {
  return (
    <div>
      <span className="text-sm font-medium text-green-600 dark:text-green-400">
        {hadith.collection} #{hadith.hadithNumber}
      </span>
      <p className="font-arabic text-sm truncate mt-1" dir="rtl">
        {hadith.arabicText.slice(0, 100)}...
      </p>
    </div>
  );
}

function RootItem({ root }: { root: { letters: string; latinized: string; coreMeaning: string } }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-arabic text-xl">{root.letters}</span>
      <div>
        <span className="font-mono text-sm text-slate-400">{root.latinized}</span>
        <p className="text-sm text-slate-600 dark:text-slate-400">{root.coreMeaning}</p>
      </div>
    </div>
  );
}
