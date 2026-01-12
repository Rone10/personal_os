"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Plus, X } from "lucide-react";
import {
  DEFAULT_TRANSLATIONS,
  AVAILABLE_TRANSLATIONS,
  fetchTranslation,
  type TranslationSource,
} from "@/lib/quranFoundationApi";
import { formatArabicWithAyahNumbers } from "@/lib/arabicNumerals";

interface VerseFormDialogProps {
  open: boolean;
  onClose: () => void;
  editId?: string;
}

interface TranslationSelection {
  sourceId: string;
  sourceName: string;
  enabled: boolean;
}

interface FetchedAyah {
  ayahNumber: number;
  arabicText: string;
  translations: Array<{
    sourceId: string;
    sourceName: string;
    text: string;
    sourceType: "api" | "custom";
  }>;
}

export default function VerseFormDialog({
  open,
  onClose,
  editId,
}: VerseFormDialogProps) {
  const existingVerse = useQuery(
    api.study.verses.getById,
    editId ? { id: editId as Id<"verses"> } : "skip"
  );
  const createVerse = useMutation(api.study.verses.create);
  const updateVerse = useMutation(api.study.verses.update);

  // Basic form fields
  const [surahNumber, setSurahNumber] = useState("");
  const [ayahStart, setAyahStart] = useState("");
  const [ayahEnd, setAyahEnd] = useState("");
  const [topic, setTopic] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Translation selection state (default 2 enabled)
  const [translationSelections, setTranslationSelections] = useState<
    TranslationSelection[]
  >(
    DEFAULT_TRANSLATIONS.map((t) => ({
      sourceId: t.id,
      sourceName: t.name,
      enabled: true,
    }))
  );

  // For adding additional translations
  const [showAddTranslation, setShowAddTranslation] = useState(false);

  // Fetched ayahs with translations
  const [fetchedAyahs, setFetchedAyahs] = useState<FetchedAyah[]>([]);

  // Custom translation (legacy support)
  const [customTranslation, setCustomTranslation] = useState("");

  // Load existing verse data
  useEffect(() => {
    if (existingVerse) {
      setSurahNumber(existingVerse.surahNumber.toString());
      setAyahStart(existingVerse.ayahStart.toString());
      setAyahEnd(existingVerse.ayahEnd?.toString() ?? "");
      setTopic(existingVerse.topic ?? "");
      setCustomTranslation(existingVerse.translation ?? "");

      // Load existing ayahs if available
      if (existingVerse.ayahs && existingVerse.ayahs.length > 0) {
        setFetchedAyahs(existingVerse.ayahs);
        // Update translation selections based on existing data
        const existingSources = new Set<string>();
        existingVerse.ayahs.forEach((ayah) => {
          ayah.translations.forEach((t) => existingSources.add(t.sourceId));
        });
        setTranslationSelections((prev) =>
          prev.map((sel) => ({
            ...sel,
            enabled: existingSources.has(sel.sourceId),
          }))
        );
      } else {
        // Legacy verse without structured ayahs
        setFetchedAyahs([]);
      }
    } else if (!editId) {
      resetForm();
    }
  }, [existingVerse, editId]);

  const resetForm = () => {
    setSurahNumber("");
    setAyahStart("");
    setAyahEnd("");
    setTopic("");
    setCustomTranslation("");
    setFetchedAyahs([]);
    setShowAddTranslation(false);
    setTranslationSelections(
      DEFAULT_TRANSLATIONS.map((t) => ({
        sourceId: t.id,
        sourceName: t.name,
        enabled: true,
      }))
    );
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Toggle translation selection
  const toggleTranslation = (sourceId: string) => {
    setTranslationSelections((prev) =>
      prev.map((sel) =>
        sel.sourceId === sourceId ? { ...sel, enabled: !sel.enabled } : sel
      )
    );
  };

  // Add a new translation to selections
  const addTranslation = (source: TranslationSource) => {
    const enabledCount = translationSelections.filter((t) => t.enabled).length;
    if (enabledCount >= 4) return; // Max 4 translations

    // Check if already exists
    const exists = translationSelections.some(
      (sel) => sel.sourceId === source.id
    );
    if (exists) {
      // Just enable it
      setTranslationSelections((prev) =>
        prev.map((sel) =>
          sel.sourceId === source.id ? { ...sel, enabled: true } : sel
        )
      );
    } else {
      // Add new selection
      setTranslationSelections((prev) => [
        ...prev,
        { sourceId: source.id, sourceName: source.name, enabled: true },
      ]);
    }
    setShowAddTranslation(false);
  };

  // Remove translation from selections
  const removeTranslation = (sourceId: string) => {
    setTranslationSelections((prev) =>
      prev.map((sel) =>
        sel.sourceId === sourceId ? { ...sel, enabled: false } : sel
      )
    );
  };

  // Get enabled translations count
  const enabledTranslationsCount = translationSelections.filter(
    (t) => t.enabled
  ).length;

  // Get available translations to add (not already selected or enabled)
  const availableToAdd = AVAILABLE_TRANSLATIONS.filter(
    (t) => !translationSelections.some((sel) => sel.sourceId === t.id && sel.enabled)
  );

  // Fetch Arabic text and translations
  const fetchFromApi = async () => {
    if (!surahNumber || !ayahStart) return;

    setIsFetching(true);
    try {
      const surah = parseInt(surahNumber);
      const start = parseInt(ayahStart);
      const end = ayahEnd ? parseInt(ayahEnd) : start;

      const ayahs: FetchedAyah[] = [];
      const enabledSources = translationSelections.filter((t) => t.enabled);

      // Fetch each ayah
      for (let ayahNum = start; ayahNum <= end; ayahNum++) {
        // Fetch Arabic text from AlQuran.cloud
        const arabicRes = await fetch(
          `https://api.alquran.cloud/v1/ayah/${surah}:${ayahNum}`
        );
        const arabicData = await arabicRes.json();

        if (!arabicData.data?.text) continue;

        const ayahTranslations: FetchedAyah["translations"] = [];

        // Fetch translations from Quran Foundation API
        for (const source of enabledSources) {
          const translationText = await fetchTranslation(
            surah,
            ayahNum,
            source.sourceId
          );
          if (translationText) {
            ayahTranslations.push({
              sourceId: source.sourceId,
              sourceName: source.sourceName,
              text: translationText,
              sourceType: "api",
            });
          }
        }

        ayahs.push({
          ayahNumber: ayahNum,
          arabicText: arabicData.data.text,
          translations: ayahTranslations,
        });
      }

      setFetchedAyahs(ayahs);
    } catch (error) {
      console.error("Failed to fetch verse:", error);
    } finally {
      setIsFetching(false);
    }
  };

  // Generate arabicText with ayah numbers for display/storage
  const getFormattedArabicText = (): string => {
    if (fetchedAyahs.length > 0) {
      return formatArabicWithAyahNumbers(fetchedAyahs);
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surahNumber || !ayahStart) return;
    if (fetchedAyahs.length === 0 && !customTranslation) return;

    setIsSaving(true);
    try {
      const arabicText = getFormattedArabicText();

      // Add custom translation to ayahs if provided
      let ayahsToSave = fetchedAyahs;
      if (customTranslation && fetchedAyahs.length > 0) {
        // Add custom translation to first ayah (for single verses)
        // or as a combined translation for ranges
        ayahsToSave = fetchedAyahs.map((ayah, idx) => ({
          ...ayah,
          translations: [
            ...ayah.translations,
            ...(idx === 0
              ? [
                  {
                    sourceId: "custom",
                    sourceName: "Custom",
                    text: customTranslation,
                    sourceType: "custom" as const,
                  },
                ]
              : []),
          ],
        }));
      }

      if (editId) {
        await updateVerse({
          id: editId as Id<"verses">,
          surahNumber: parseInt(surahNumber),
          ayahStart: parseInt(ayahStart),
          ayahEnd: ayahEnd ? parseInt(ayahEnd) : undefined,
          arabicText: arabicText || existingVerse?.arabicText || "",
          translation: customTranslation || undefined,
          topic: topic || undefined,
          ayahs: ayahsToSave.length > 0 ? ayahsToSave : undefined,
        });
      } else {
        await createVerse({
          surahNumber: parseInt(surahNumber),
          ayahStart: parseInt(ayahStart),
          ayahEnd: ayahEnd ? parseInt(ayahEnd) : undefined,
          arabicText,
          translation: customTranslation || undefined,
          topic: topic || undefined,
          ayahs: ayahsToSave.length > 0 ? ayahsToSave : undefined,
        });
      }
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? "Edit Verse" : "Add Verse"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Surah and Ayah */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="surahNumber">Surah *</Label>
              <Input
                id="surahNumber"
                type="number"
                min="1"
                max="114"
                value={surahNumber}
                onChange={(e) => setSurahNumber(e.target.value)}
                placeholder="1-114"
                required
              />
            </div>
            <div>
              <Label htmlFor="ayahStart">Ayah Start *</Label>
              <Input
                id="ayahStart"
                type="number"
                min="1"
                value={ayahStart}
                onChange={(e) => setAyahStart(e.target.value)}
                placeholder="1"
                required
              />
            </div>
            <div>
              <Label htmlFor="ayahEnd">Ayah End</Label>
              <Input
                id="ayahEnd"
                type="number"
                min="1"
                value={ayahEnd}
                onChange={(e) => setAyahEnd(e.target.value)}
                placeholder="(optional)"
              />
            </div>
          </div>

          {/* Translation Selection */}
          <div className="space-y-2">
            <Label>Translations (select up to 4)</Label>
            <div className="space-y-2">
              {translationSelections
                .filter((sel) => sel.enabled)
                .map((sel) => (
                  <div
                    key={sel.sourceId}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => toggleTranslation(sel.sourceId)}
                      />
                      <span className="text-sm">{sel.sourceName}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTranslation(sel.sourceId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

              {/* Add Translation Button/Dropdown */}
              {enabledTranslationsCount < 4 && (
                <div>
                  {showAddTranslation ? (
                    <div className="flex gap-2">
                      <Select
                        onValueChange={(value) => {
                          const source = AVAILABLE_TRANSLATIONS.find(
                            (t) => t.id === value
                          );
                          if (source) addTranslation(source);
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select translation..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableToAdd.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddTranslation(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddTranslation(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Translation
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fetch Button */}
          <Button
            type="button"
            variant="outline"
            onClick={fetchFromApi}
            disabled={!surahNumber || !ayahStart || isFetching}
            className="w-full"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Fetch Arabic + Translations
          </Button>

          {/* Fetched Ayahs Preview */}
          {fetchedAyahs.length > 0 && (
            <div className="space-y-4">
              {/* Arabic Text Preview */}
              <div>
                <Label>Arabic Text (with ayah numbers)</Label>
                <div
                  className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 mt-1"
                  dir="rtl"
                >
                  <p className="font-quran text-xl leading-loose text-slate-900 dark:text-slate-100 text-center">
                    {getFormattedArabicText()}
                  </p>
                </div>
              </div>

              {/* Translation Preview */}
              <div>
                <Label>Translations Preview</Label>
                <div className="space-y-3 mt-1">
                  {fetchedAyahs.map((ayah) => (
                    <div
                      key={ayah.ayahNumber}
                      className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="text-xs font-medium text-slate-500 mb-2">
                        Ayah {ayah.ayahNumber}
                      </div>
                      {ayah.translations.map((t, idx) => (
                        <div key={idx} className="mb-2 last:mb-0">
                          <span className="text-xs font-semibold text-slate-400 uppercase">
                            {t.sourceName}:
                          </span>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {t.text}
                          </p>
                        </div>
                      ))}
                      {ayah.translations.length === 0 && (
                        <p className="text-sm text-slate-400 italic">
                          No translations fetched
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Custom Translation (for manual entry or legacy) */}
          <div>
            <Label htmlFor="customTranslation">
              Custom Translation (optional)
            </Label>
            <Textarea
              id="customTranslation"
              value={customTranslation}
              onChange={(e) => setCustomTranslation(e.target.value)}
              placeholder="Add your own translation or notes..."
              rows={3}
            />
          </div>

          {/* Topic */}
          <div>
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Faith, Prayer, Charity"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSaving ||
                !surahNumber ||
                !ayahStart ||
                (fetchedAyahs.length === 0 && !customTranslation)
              }
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
