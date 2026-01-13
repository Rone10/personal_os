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

  // Manual entry mode
  const [manualMode, setManualMode] = useState(false);
  const [manualArabicText, setManualArabicText] = useState("");
  const [manualTranslation, setManualTranslation] = useState("");

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

  // Per-ayah custom translations
  const [customTranslations, setCustomTranslations] = useState<Record<number, string>>({});

  // Load existing verse data
  useEffect(() => {
    if (existingVerse) {
      setSurahNumber(existingVerse.surahNumber.toString());
      setAyahStart(existingVerse.ayahStart.toString());
      setAyahEnd(existingVerse.ayahEnd?.toString() ?? "");
      setTopic(existingVerse.topic ?? "");

      // Load existing ayahs if available
      if (existingVerse.ayahs && existingVerse.ayahs.length > 0) {
        // Check if this is a manual-only verse (only custom translations, no API)
        const hasOnlyCustom = existingVerse.ayahs.every((ayah) =>
          ayah.translations.every((t) => t.sourceType === "custom")
        );

        if (hasOnlyCustom && existingVerse.ayahs.length === 1) {
          // Load as manual mode for single-ayah manual entries
          setManualMode(true);
          setManualArabicText(existingVerse.ayahs[0].arabicText);
          const customT = existingVerse.ayahs[0].translations.find(
            (t) => t.sourceType === "custom"
          );
          setManualTranslation(customT?.text ?? "");
          setFetchedAyahs([]);
          setCustomTranslations({});
        } else {
          // Load as normal fetched mode
          setManualMode(false);
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

          // Load existing custom translations
          const customs: Record<number, string> = {};
          existingVerse.ayahs.forEach((ayah) => {
            const customT = ayah.translations.find((t) => t.sourceType === "custom");
            if (customT) customs[ayah.ayahNumber] = customT.text;
          });
          setCustomTranslations(customs);
        }
      } else {
        // Legacy verse without structured ayahs
        setManualMode(false);
        setFetchedAyahs([]);
        setCustomTranslations({});
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
    setCustomTranslations({});
    setFetchedAyahs([]);
    setShowAddTranslation(false);
    setManualMode(false);
    setManualArabicText("");
    setManualTranslation("");
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
    if (manualMode) {
      // For manual mode, format with ayah number
      const start = parseInt(ayahStart);
      return formatArabicWithAyahNumbers([
        { ayahNumber: start, arabicText: manualArabicText },
      ]);
    }
    if (fetchedAyahs.length > 0) {
      return formatArabicWithAyahNumbers(fetchedAyahs);
    }
    return "";
  };

  // Check if form can be submitted
  const canSubmit = (): boolean => {
    if (!surahNumber || !ayahStart) return false;
    if (manualMode) {
      return manualArabicText.trim().length > 0;
    }
    return fetchedAyahs.length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit()) return;

    setIsSaving(true);
    try {
      const arabicText = getFormattedArabicText();

      let ayahsToSave: FetchedAyah[];

      if (manualMode) {
        // Construct ayahs from manual input
        const start = parseInt(ayahStart);
        ayahsToSave = [
          {
            ayahNumber: start,
            arabicText: manualArabicText.trim(),
            translations: manualTranslation.trim()
              ? [
                  {
                    sourceId: "custom",
                    sourceName: "Custom",
                    text: manualTranslation.trim(),
                    sourceType: "custom" as const,
                  },
                ]
              : [],
          },
        ];
      } else {
        // Add per-ayah custom translations if provided
        ayahsToSave = fetchedAyahs.map((ayah) => ({
          ...ayah,
          translations: [
            // Filter out existing custom translations (will be replaced)
            ...ayah.translations.filter((t) => t.sourceType !== "custom"),
            // Add custom translation if provided for this ayah
            ...(customTranslations[ayah.ayahNumber]
              ? [
                  {
                    sourceId: "custom",
                    sourceName: "Custom",
                    text: customTranslations[ayah.ayahNumber],
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
          topic: topic || undefined,
          ayahs: ayahsToSave.length > 0 ? ayahsToSave : undefined,
        });
      } else {
        await createVerse({
          surahNumber: parseInt(surahNumber),
          ayahStart: parseInt(ayahStart),
          ayahEnd: ayahEnd ? parseInt(ayahEnd) : undefined,
          arabicText,
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
          {/* Manual Entry Mode Toggle */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <Checkbox
              id="manualMode"
              checked={manualMode}
              onCheckedChange={(checked) => {
                setManualMode(!!checked);
                // Clear fetched data when switching modes
                if (checked) {
                  setFetchedAyahs([]);
                  setCustomTranslations({});
                } else {
                  setManualArabicText("");
                  setManualTranslation("");
                }
              }}
            />
            <Label htmlFor="manualMode" className="text-sm cursor-pointer">
              Enter verse manually (skip API fetch)
            </Label>
          </div>

          {/* Surah and Ayah */}
          <div className={manualMode ? "grid grid-cols-2 gap-4" : "grid grid-cols-3 gap-4"}>
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
              <Label htmlFor="ayahStart">{manualMode ? "Ayah *" : "Ayah Start *"}</Label>
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
            {!manualMode && (
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
            )}
          </div>

          {/* Manual Entry Fields */}
          {manualMode && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="manualArabic">Arabic Text *</Label>
                <Textarea
                  id="manualArabic"
                  value={manualArabicText}
                  onChange={(e) => setManualArabicText(e.target.value)}
                  placeholder="Enter Arabic text..."
                  className="font-quran text-lg mt-1"
                  dir="rtl"
                  rows={3}
                  required
                />
              </div>
              <div>
                <Label htmlFor="manualTranslation">Your Translation</Label>
                <Textarea
                  id="manualTranslation"
                  value={manualTranslation}
                  onChange={(e) => setManualTranslation(e.target.value)}
                  placeholder="Enter your translation (optional)..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Translation Selection (API mode only) */}
          {!manualMode && (
            <>
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

              {/* Translations with per-ayah custom input */}
              <div>
                <Label>Translations</Label>
                <div className="space-y-4 mt-1">
                  {fetchedAyahs.map((ayah) => (
                    <div
                      key={ayah.ayahNumber}
                      className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="text-xs font-medium text-slate-500 mb-2">
                        Ayah {ayah.ayahNumber}
                      </div>

                      {/* API translations */}
                      {ayah.translations
                        .filter((t) => t.sourceType !== "custom")
                        .map((t, idx) => (
                          <div key={idx} className="mb-2">
                            <span className="text-xs font-semibold text-slate-400 uppercase">
                              {t.sourceName}:
                            </span>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {t.text}
                            </p>
                          </div>
                        ))}

                      {ayah.translations.filter((t) => t.sourceType !== "custom")
                        .length === 0 && (
                        <p className="text-sm text-slate-400 italic mb-2">
                          No API translations fetched
                        </p>
                      )}

                      {/* Per-ayah custom translation input */}
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <Label className="text-xs text-slate-500">
                          Custom Translation:
                        </Label>
                        <Textarea
                          value={customTranslations[ayah.ayahNumber] || ""}
                          onChange={(e) =>
                            setCustomTranslations((prev) => ({
                              ...prev,
                              [ayah.ayahNumber]: e.target.value,
                            }))
                          }
                          placeholder="Add your own translation for this ayah..."
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
            </>
          )}

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
              disabled={isSaving || !canSubmit()}
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
