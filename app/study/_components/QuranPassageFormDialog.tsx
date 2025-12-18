'use client';

import { useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

/**
 * Capture a Quran passage (surah + ayah range + Arabic text) and at least one translation.
 *
 * Notes and additional translations are added from the detail view.
 */
export function QuranPassageFormDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (passageId: string) => void;
}) {
  const createQuranPassage = useMutation(api.study.createQuranPassage);
  const createMeaning = useMutation(api.study.createMeaning);

  const [surah, setSurah] = useState('');
  const [ayahStart, setAyahStart] = useState('');
  const [ayahEnd, setAyahEnd] = useState('');
  const [arabicText, setArabicText] = useState('');
  const [translation, setTranslation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = useMemo(() => {
    return Boolean(surah.trim() && ayahStart.trim() && arabicText.trim() && translation.trim());
  }, [arabicText, ayahStart, surah, translation]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const surahNum = Number(surah);
    const ayahStartNum = Number(ayahStart);
    const ayahEndNum = ayahEnd.trim() ? Number(ayahEnd) : undefined;

    setIsSaving(true);
    try {
      const passageId = await createQuranPassage({
        surah: surahNum,
        ayahStart: ayahStartNum,
        ayahEnd: ayahEndNum,
        arabicText: arabicText.trim(),
      });

      await createMeaning({
        ownerType: 'quran_passage',
        ownerId: passageId,
        text: translation.trim(),
        language: 'en',
        isPrimary: true,
      });

      onCreated(passageId);
      onOpenChange(false);

      setSurah('');
      setAyahStart('');
      setAyahEnd('');
      setArabicText('');
      setTranslation('');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Verse Capture</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="q_surah">Surah</Label>
              <Input
                id="q_surah"
                value={surah}
                onChange={(e) => setSurah(e.target.value)}
                inputMode="numeric"
                placeholder="2"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q_ayah_start">Ayah Start</Label>
              <Input
                id="q_ayah_start"
                value={ayahStart}
                onChange={(e) => setAyahStart(e.target.value)}
                inputMode="numeric"
                placeholder="255"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q_ayah_end">Ayah End (optional)</Label>
              <Input
                id="q_ayah_end"
                value={ayahEnd}
                onChange={(e) => setAyahEnd(e.target.value)}
                inputMode="numeric"
                placeholder="257"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="q_arabic">Arabic Ayah Text</Label>
            <Textarea
              id="q_arabic"
              value={arabicText}
              onChange={(e) => setArabicText(e.target.value)}
              required
              className="font-arabic text-right"
              dir="rtl"
              placeholder="اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="q_translation">Translation / Meaning</Label>
            <Textarea
              id="q_translation"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              required
              placeholder="Allah—there is no deity except Him..."
            />
            <div className="text-xs text-slate-500">Saved as the passage’s primary translation (you can add more later).</div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

