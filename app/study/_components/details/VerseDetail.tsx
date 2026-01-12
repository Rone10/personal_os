"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { BookOpen, Edit2, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArabicText } from "@/components/ui/arabic-text";
import { EntityType, ViewType } from "../StudyPageClient";
import { formatArabicWithAyahNumbers } from "@/lib/arabicNumerals";

interface VerseDetailProps {
  verseId: string;
  onNavigate: (
    view: ViewType,
    type?: EntityType,
    id?: string,
    parent?: string
  ) => void;
  onEdit: () => void;
}

interface AyahTranslation {
  sourceId: string;
  sourceName: string;
  text: string;
  sourceType: "api" | "custom";
}

interface Ayah {
  ayahNumber: number;
  arabicText: string;
  translations: AyahTranslation[];
}

export default function VerseDetail({
  verseId,
  onNavigate,
  onEdit,
}: VerseDetailProps) {
  const verse = useQuery(api.study.verses.getById, {
    id: verseId as Id<"verses">,
  });
  const deleteVerse = useMutation(api.study.verses.remove);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (verse === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (verse === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Verse not found</p>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteVerse({ id: verseId as Id<"verses"> });
    onNavigate("verses");
  };

  const verseReference = verse.ayahEnd
    ? `${verse.surahNumber}:${verse.ayahStart}-${verse.ayahEnd}`
    : `${verse.surahNumber}:${verse.ayahStart}`;

  // Check if we have structured ayahs (new format) or legacy format
  const hasStructuredAyahs = verse.ayahs && verse.ayahs.length > 0;
  const ayahs = (verse.ayahs ?? []) as Ayah[];

  // Get formatted Arabic text with ayah numbers
  const getDisplayArabicText = (): string => {
    if (hasStructuredAyahs) {
      return formatArabicWithAyahNumbers(ayahs);
    }
    return verse.arabicText;
  };

  // Get all unique translation sources from ayahs
  const getTranslationSources = (): string[] => {
    if (!hasStructuredAyahs) return [];
    const sources = new Set<string>();
    ayahs.forEach((ayah) => {
      ayah.translations.forEach((t) => sources.add(t.sourceName));
    });
    return Array.from(sources);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Quran {verseReference}
            </h1>
            <p className="text-slate-500">
              Surah {verse.surahNumber}, Ayah {verse.ayahStart}
              {verse.ayahEnd && ` - ${verse.ayahEnd}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Confirm
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Arabic Text */}
      <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
        <ArabicText
          variant="quran"
          size="2xl"
          as="p"
          className="leading-loose text-slate-900 dark:text-slate-100 text-center"
        >
          {getDisplayArabicText()}
        </ArabicText>
      </div>

      {/* Translations Section */}
      {hasStructuredAyahs ? (
        // New format: Per-ayah translations
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Translations
          </h2>
          <div className="space-y-4">
            {ayahs.map((ayah) => (
              <div
                key={ayah.ayahNumber}
                className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
              >
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
                  Ayah {ayah.ayahNumber}
                </div>
                {ayah.translations.length > 0 ? (
                  <div className="space-y-3">
                    {ayah.translations.map((translation, idx) => (
                      <div key={idx}>
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                          {translation.sourceName}
                          {translation.sourceType === "custom" && " (Custom)"}:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mt-1">
                          {translation.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-sm">
                    No translations available
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : verse.translation ? (
        // Legacy format: Single translation
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Translation
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
            {verse.translation}
          </p>
        </div>
      ) : null}

      {/* Topic */}
      {verse.topic && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Topic
          </h2>
          <Badge variant="secondary" className="text-sm">
            {verse.topic}
          </Badge>
        </div>
      )}

      {/* Metadata */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Surah Number</span>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {verse.surahNumber}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Ayah</span>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {verse.ayahStart}
              {verse.ayahEnd && ` - ${verse.ayahEnd}`}
            </p>
          </div>
          {hasStructuredAyahs && (
            <div className="col-span-2">
              <span className="text-slate-500">Translation Sources</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {getTranslationSources().join(", ") || "None"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
