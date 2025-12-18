'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export function QuranPassageEditDialog({
  open,
  onOpenChange,
  passage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passage: Doc<'studyQuranPassages'>;
}) {
  const updateQuranPassage = useMutation(api.study.updateQuranPassage);

  const [surah, setSurah] = useState(String(passage.surah));
  const [ayahStart, setAyahStart] = useState(String(passage.ayahStart));
  const [ayahEnd, setAyahEnd] = useState(passage.ayahEnd ? String(passage.ayahEnd) : '');
  const [arabicText, setArabicText] = useState(passage.arabicText);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSurah(String(passage.surah));
    setAyahStart(String(passage.ayahStart));
    setAyahEnd(passage.ayahEnd ? String(passage.ayahEnd) : '');
    setArabicText(passage.arabicText);
  }, [open, passage]);

  const isDirty = useMemo(() => {
    return (
      surah !== String(passage.surah) ||
      ayahStart !== String(passage.ayahStart) ||
      ayahEnd !== (passage.ayahEnd ? String(passage.ayahEnd) : '') ||
      arabicText !== passage.arabicText
    );
  }, [arabicText, ayahEnd, ayahStart, passage, surah]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty) return;

    setIsSaving(true);
    try {
      await updateQuranPassage({
        id: passage._id,
        surah: Number(surah),
        ayahStart: Number(ayahStart),
        ayahEnd: ayahEnd.trim() ? Number(ayahEnd) : null,
        arabicText: arabicText.trim(),
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Verse Capture</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit_surah">Surah</Label>
              <Input id="edit_surah" value={surah} onChange={(e) => setSurah(e.target.value)} inputMode="numeric" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_ayah_start">Ayah Start</Label>
              <Input
                id="edit_ayah_start"
                value={ayahStart}
                onChange={(e) => setAyahStart(e.target.value)}
                inputMode="numeric"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_ayah_end">Ayah End</Label>
              <Input id="edit_ayah_end" value={ayahEnd} onChange={(e) => setAyahEnd(e.target.value)} inputMode="numeric" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_ayah_text">Arabic Ayah Text</Label>
            <Textarea
              id="edit_ayah_text"
              value={arabicText}
              onChange={(e) => setArabicText(e.target.value)}
              className="font-arabic text-right min-h-28"
              dir="rtl"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isDirty || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

