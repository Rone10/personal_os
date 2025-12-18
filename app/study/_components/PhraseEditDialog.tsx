'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export function PhraseEditDialog({
  open,
  onOpenChange,
  phrase,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phrase: Doc<'studyPhrases'>;
}) {
  const updatePhrase = useMutation(api.study.updatePhrase);

  const [arabicText, setArabicText] = useState(phrase.arabicText);
  const [transliteration, setTransliteration] = useState(phrase.transliteration ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setArabicText(phrase.arabicText);
    setTransliteration(phrase.transliteration ?? '');
  }, [open, phrase]);

  const isDirty = useMemo(() => {
    return arabicText !== phrase.arabicText || transliteration !== (phrase.transliteration ?? '');
  }, [arabicText, phrase, transliteration]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty) return;

    setIsSaving(true);
    try {
      await updatePhrase({
        id: phrase._id,
        arabicText: arabicText.trim(),
        transliteration: transliteration.trim() || null,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Phrase</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit_phrase_arabic">Arabic Phrase</Label>
            <Input
              id="edit_phrase_arabic"
              value={arabicText}
              onChange={(e) => setArabicText(e.target.value)}
              className="font-arabic text-lg text-right"
              dir="rtl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_phrase_translit">Transliteration</Label>
            <Input
              id="edit_phrase_translit"
              value={transliteration}
              onChange={(e) => setTransliteration(e.target.value)}
              placeholder="…"
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

