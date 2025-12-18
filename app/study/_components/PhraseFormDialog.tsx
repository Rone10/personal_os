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
 * “Quick capture” for a new phrase.
 */
export function PhraseFormDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (phraseId: string) => void;
}) {
  const createPhrase = useMutation(api.study.createPhrase);
  const createMeaning = useMutation(api.study.createMeaning);

  const [arabicText, setArabicText] = useState('');
  const [transliteration, setTransliteration] = useState('');
  const [meaning, setMeaning] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = useMemo(() => arabicText.trim() && meaning.trim(), [arabicText, meaning]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSaving(true);
    try {
      const phraseId = await createPhrase({
        arabicText: arabicText.trim(),
        transliteration: transliteration.trim() || undefined,
      });

      await createMeaning({
        ownerType: 'phrase',
        ownerId: phraseId,
        text: meaning.trim(),
        language: 'en',
        isPrimary: true,
      });

      onCreated(phraseId);
      onOpenChange(false);

      setArabicText('');
      setTransliteration('');
      setMeaning('');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Phrase</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phrase_arabic_text">Arabic Phrase</Label>
            <Input
              id="phrase_arabic_text"
              value={arabicText}
              onChange={(e) => setArabicText(e.target.value)}
              required
              className="font-arabic text-lg text-right"
              dir="rtl"
              placeholder="إِنَّ مَعَ الْعُسْرِ يُسْرًا"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phrase_transliteration">Transliteration (optional)</Label>
            <Input
              id="phrase_transliteration"
              value={transliteration}
              onChange={(e) => setTransliteration(e.target.value)}
              placeholder="inna ma'a al-'usri yusra"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phrase_meaning">Meaning / Translation</Label>
            <Textarea
              id="phrase_meaning"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              required
              placeholder="Indeed, with hardship comes ease."
            />
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

