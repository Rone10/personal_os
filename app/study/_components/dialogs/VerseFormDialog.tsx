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
import { Loader2, Search } from "lucide-react";

interface VerseFormDialogProps {
  open: boolean;
  onClose: () => void;
  editId?: string;
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

  const [surahNumber, setSurahNumber] = useState("");
  const [ayahStart, setAyahStart] = useState("");
  const [ayahEnd, setAyahEnd] = useState("");
  const [arabicText, setArabicText] = useState("");
  const [translation, setTranslation] = useState("");
  const [topic, setTopic] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (existingVerse) {
      setSurahNumber(existingVerse.surahNumber.toString());
      setAyahStart(existingVerse.ayahStart.toString());
      setAyahEnd(existingVerse.ayahEnd?.toString() ?? "");
      setArabicText(existingVerse.arabicText);
      setTranslation(existingVerse.translation ?? "");
      setTopic(existingVerse.topic ?? "");
    } else if (!editId) {
      resetForm();
    }
  }, [existingVerse, editId]);

  const resetForm = () => {
    setSurahNumber("");
    setAyahStart("");
    setAyahEnd("");
    setArabicText("");
    setTranslation("");
    setTopic("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const fetchFromApi = async () => {
    if (!surahNumber || !ayahStart) return;

    setIsFetching(true);
    try {
      const surah = parseInt(surahNumber);
      const ayah = parseInt(ayahStart);
      const end = ayahEnd ? parseInt(ayahEnd) : undefined;

      // Fetch from alquran.cloud API
      const url = `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}`;
      if (end && end > ayah) {
        // For ranges, we need to fetch each ayah
        const verses: string[] = [];
        for (let i = ayah; i <= end; i++) {
          const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${i}`);
          const data = await res.json();
          if (data.data?.text) {
            verses.push(data.data.text);
          }
        }
        setArabicText(verses.join(" "));
      } else {
        const res = await fetch(url);
        const data = await res.json();
        if (data.data?.text) {
          setArabicText(data.data.text);
        }
      }
    } catch (error) {
      console.error("Failed to fetch verse:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surahNumber || !ayahStart || !arabicText.trim()) return;

    setIsSaving(true);
    try {
      if (editId) {
        await updateVerse({
          id: editId as Id<"verses">,
          surahNumber: parseInt(surahNumber),
          ayahStart: parseInt(ayahStart),
          ayahEnd: ayahEnd ? parseInt(ayahEnd) : undefined,
          arabicText,
          translation: translation || undefined,
          topic: topic || undefined,
        });
      } else {
        await createVerse({
          surahNumber: parseInt(surahNumber),
          ayahStart: parseInt(ayahStart),
          ayahEnd: ayahEnd ? parseInt(ayahEnd) : undefined,
          arabicText,
          translation: translation || undefined,
          topic: topic || undefined,
        });
      }
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
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
            Fetch from Quran API
          </Button>

          {/* Arabic Text */}
          <div>
            <Label htmlFor="arabicText">Arabic Text *</Label>
            <Textarea
              id="arabicText"
              value={arabicText}
              onChange={(e) => setArabicText(e.target.value)}
              className="font-arabic text-lg"
              dir="rtl"
              rows={4}
              required
            />
          </div>

          {/* Translation */}
          <div>
            <Label htmlFor="translation">Translation</Label>
            <Textarea
              id="translation"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="English translation..."
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
              disabled={isSaving || !surahNumber || !ayahStart || !arabicText.trim()}
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
