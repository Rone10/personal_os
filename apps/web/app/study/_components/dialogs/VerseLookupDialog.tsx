"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, BookOpen, Save } from "lucide-react";
import {
  fetchVerse,
  fetchVerseRange,
  fetchSurahInfo,
  QuranVerse,
  QuranSurah,
} from "@/lib/quranApi";

interface VerseLookupDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (verseId: string) => void;
}

export default function VerseLookupDialog({
  open,
  onClose,
  onSaved,
}: VerseLookupDialogProps) {
  const [surahNumber, setSurahNumber] = useState("");
  const [ayahStart, setAyahStart] = useState("");
  const [ayahEnd, setAyahEnd] = useState("");
  const [surahInfo, setSurahInfo] = useState<QuranSurah | null>(null);
  const [verses, setVerses] = useState<QuranVerse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createVerse = useMutation(api.study.verses.create);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSurahNumber("");
      setAyahStart("");
      setAyahEnd("");
      setSurahInfo(null);
      setVerses([]);
      setError(null);
    }
  }, [open]);

  // Fetch surah info when surah number changes
  useEffect(() => {
    const num = parseInt(surahNumber, 10);
    if (num >= 1 && num <= 114) {
      fetchSurahInfo(num).then((info) => {
        setSurahInfo(info);
        setError(null);
      });
    } else {
      setSurahInfo(null);
    }
  }, [surahNumber]);

  const handleLookup = async () => {
    const surah = parseInt(surahNumber, 10);
    const start = parseInt(ayahStart, 10);
    const end = ayahEnd ? parseInt(ayahEnd, 10) : start;

    if (!surah || surah < 1 || surah > 114) {
      setError("Please enter a valid surah number (1-114)");
      return;
    }

    if (!start || start < 1) {
      setError("Please enter a valid starting ayah number");
      return;
    }

    if (surahInfo && start > surahInfo.numberOfAyahs) {
      setError(`Surah ${surah} only has ${surahInfo.numberOfAyahs} ayahs`);
      return;
    }

    if (end < start) {
      setError("End ayah must be greater than or equal to start ayah");
      return;
    }

    setIsLoading(true);
    setError(null);
    setVerses([]);

    try {
      if (end === start) {
        const verse = await fetchVerse(surah, start);
        if (verse) {
          setVerses([verse]);
        } else {
          setError("Verse not found");
        }
      } else {
        const fetchedVerses = await fetchVerseRange(surah, start, end);
        if (fetchedVerses.length > 0) {
          setVerses(fetchedVerses);
        } else {
          setError("No verses found in range");
        }
      }
    } catch {
      setError("Failed to fetch verses");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (verses.length === 0) return;

    setIsSaving(true);
    try {
      const surah = parseInt(surahNumber, 10);
      const start = parseInt(ayahStart, 10);
      const end = ayahEnd ? parseInt(ayahEnd, 10) : start;

      // Combine all verse texts
      const combinedText = verses.map((v) => v.text).join(" ");

      const verseId = await createVerse({
        surahNumber: surah,
        ayahStart: start,
        ayahEnd: end !== start ? end : undefined,
        arabicText: combinedText,
      });

      onSaved?.(verseId);
      onClose();
    } catch {
      setError("Failed to save verse");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Lookup Quran Verse
          </DialogTitle>
          <DialogDescription>
            Fetch verse text from the Quran and save it to your study library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Surah Input */}
          <div className="space-y-2">
            <Label htmlFor="surah">Surah Number (1-114)</Label>
            <Input
              id="surah"
              type="number"
              min={1}
              max={114}
              placeholder="e.g., 2"
              value={surahNumber}
              onChange={(e) => setSurahNumber(e.target.value)}
            />
            {surahInfo && (
              <p className="text-sm text-slate-500">
                {surahInfo.englishName} ({surahInfo.name}) -{" "}
                {surahInfo.numberOfAyahs} ayahs
              </p>
            )}
          </div>

          {/* Ayah Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ayahStart">Starting Ayah</Label>
              <Input
                id="ayahStart"
                type="number"
                min={1}
                placeholder="e.g., 255"
                value={ayahStart}
                onChange={(e) => setAyahStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ayahEnd">Ending Ayah (optional)</Label>
              <Input
                id="ayahEnd"
                type="number"
                min={1}
                placeholder="e.g., 256"
                value={ayahEnd}
                onChange={(e) => setAyahEnd(e.target.value)}
              />
            </div>
          </div>

          {/* Lookup Button */}
          <Button
            onClick={handleLookup}
            disabled={isLoading || !surahNumber || !ayahStart}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Lookup Verse
          </Button>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          {/* Preview */}
          {verses.length > 0 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                  <BookOpen className="h-4 w-4" />
                  <span>
                    {surahInfo?.englishName} {surahNumber}:
                    {ayahEnd && parseInt(ayahEnd, 10) !== parseInt(ayahStart, 10)
                      ? `${ayahStart}-${ayahEnd}`
                      : ayahStart}
                  </span>
                </div>
                <p
                  className="font-arabic text-xl leading-loose text-right"
                  dir="rtl"
                >
                  {verses.map((v) => v.text).join(" ")}
                </p>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full"
                variant="default"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save to Library
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
