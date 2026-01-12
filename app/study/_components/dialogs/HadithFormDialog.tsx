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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface HadithFormDialogProps {
  open: boolean;
  onClose: () => void;
  editId?: string;
}

const COLLECTIONS = [
  "Sahih Bukhari",
  "Sahih Muslim",
  "Sunan Abu Dawud",
  "Jami at-Tirmidhi",
  "Sunan an-Nasa'i",
  "Sunan Ibn Majah",
  "Muwatta Malik",
  "Musnad Ahmad",
  "Other",
];

const GRADINGS = ["sahih", "hasan", "daif", "mawdu"];

export default function HadithFormDialog({
  open,
  onClose,
  editId,
}: HadithFormDialogProps) {
  const existingHadith = useQuery(
    api.study.hadiths.getById,
    editId ? { id: editId as Id<"hadiths"> } : "skip"
  );
  const createHadith = useMutation(api.study.hadiths.create);
  const updateHadith = useMutation(api.study.hadiths.update);

  const [collection, setCollection] = useState("");
  const [bookName, setBookName] = useState("");
  const [hadithNumber, setHadithNumber] = useState("");
  const [grading, setGrading] = useState("");
  const [narratorChain, setNarratorChain] = useState("");
  const [arabicText, setArabicText] = useState("");
  const [translation, setTranslation] = useState("");
  const [topic, setTopic] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingHadith) {
      setCollection(existingHadith.collection);
      setBookName(existingHadith.bookName ?? "");
      setHadithNumber(existingHadith.hadithNumber);
      setGrading(existingHadith.grading ?? "");
      setNarratorChain(existingHadith.narratorChain ?? "");
      setArabicText(existingHadith.arabicText);
      setTranslation(existingHadith.translation ?? "");
      setTopic(existingHadith.topic ?? "");
    } else if (!editId) {
      resetForm();
    }
  }, [existingHadith, editId]);

  const resetForm = () => {
    setCollection("");
    setBookName("");
    setHadithNumber("");
    setGrading("");
    setNarratorChain("");
    setArabicText("");
    setTranslation("");
    setTopic("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collection || !hadithNumber || !arabicText.trim()) return;

    setIsSaving(true);
    try {
      const gradingValue = grading as "sahih" | "hasan" | "daif" | "mawdu" | undefined;

      if (editId) {
        await updateHadith({
          id: editId as Id<"hadiths">,
          collection,
          bookName: bookName || undefined,
          hadithNumber,
          grading: gradingValue || undefined,
          narratorChain: narratorChain || undefined,
          arabicText,
          translation: translation || undefined,
          topic: topic || undefined,
        });
      } else {
        await createHadith({
          collection,
          bookName: bookName || undefined,
          hadithNumber,
          grading: gradingValue || undefined,
          narratorChain: narratorChain || undefined,
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? "Edit Hadith" : "Add Hadith"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Collection and Number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Collection *</Label>
              <Select value={collection} onValueChange={setCollection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  {COLLECTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="hadithNumber">Hadith Number *</Label>
              <Input
                id="hadithNumber"
                value={hadithNumber}
                onChange={(e) => setHadithNumber(e.target.value)}
                placeholder="e.g., 1, 123"
                required
              />
            </div>
          </div>

          {/* Book Name and Grading */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bookName">Book Name</Label>
              <Input
                id="bookName"
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                placeholder="e.g., Book of Faith"
              />
            </div>
            <div>
              <Label>Grading</Label>
              <Select value={grading} onValueChange={setGrading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grading" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Not specified</SelectItem>
                  {GRADINGS.map((g) => (
                    <SelectItem key={g} value={g} className="capitalize">
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Narrator Chain */}
          <div>
            <Label htmlFor="narratorChain">Chain of Narration (Isnad)</Label>
            <Textarea
              id="narratorChain"
              value={narratorChain}
              onChange={(e) => setNarratorChain(e.target.value)}
              placeholder="e.g., Narrated by Abu Hurairah..."
              rows={2}
            />
          </div>

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
              placeholder="e.g., Faith, Purification, Prayer"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !collection || !hadithNumber || !arabicText.trim()}
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
