"use client";

import { Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Verse {
  _id: string;
  surahNumber: number;
  surahNameArabic?: string;
  surahNameEnglish?: string;
  ayahStart: number;
  ayahEnd?: number;
  arabicText: string;
}

interface VersesListProps {
  verses: Verse[];
  selectedId?: string;
  filterSurah?: number;
  onSelect: (id: string) => void;
  onAdd?: () => void;
}

export default function VersesList({
  verses,
  selectedId,
  filterSurah,
  onSelect,
  onAdd,
}: VersesListProps) {

  const filteredVerses = filterSurah
    ? verses.filter((v) => v.surahNumber === filterSurah)
    : verses;

  // Group by surah
  const groupedVerses = filteredVerses.reduce(
    (acc, verse) => {
      const key = verse.surahNumber;
      if (!acc[key]) acc[key] = [];
      acc[key].push(verse);
      return acc;
    },
    {} as Record<number, Verse[]>
  );

  const formatRef = (v: Verse) => {
    const ayah = v.ayahEnd ? `${v.ayahStart}-${v.ayahEnd}` : v.ayahStart;
    return `${v.surahNumber}:${ayah}`;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-slate-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Quran Verses
            </h1>
            <p className="text-sm text-slate-500">
              {filteredVerses.length} verses saved
              {filterSurah && ` from Surah ${filterSurah}`}
            </p>
          </div>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Verse
        </Button>
      </div>

      {/* Verse list */}
      {filteredVerses.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No verses saved yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Add Quran verses to study and reference
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={onAdd}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Verse
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedVerses).map(([surah, surahVerses]) => (
            <div key={surah}>
              <h2 className="text-sm font-semibold text-slate-500 mb-2">
                Surah {surah}
                {surahVerses[0]?.surahNameEnglish &&
                  ` - ${surahVerses[0].surahNameEnglish}`}
              </h2>
              <div className="grid gap-2">
                {surahVerses.map((verse) => (
                  <div
                    key={verse._id}
                    onClick={() => onSelect(verse._id)}
                    className={cn(
                      "p-4 bg-white dark:bg-slate-800 rounded-lg border cursor-pointer transition-colors",
                      selectedId === verse._id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-sm font-mono text-slate-400 flex-shrink-0">
                        {formatRef(verse)}
                      </span>
                      <p
                        className="font-arabic text-lg leading-relaxed text-right flex-1"
                        dir="rtl"
                      >
                        {verse.arabicText}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
