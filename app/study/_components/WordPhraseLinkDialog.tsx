'use client';

import { useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

/**
 * Adds a phrase example to an existing word.
 *
 * Minimal by design: it creates a phrase and links it to the word.
 * Meanings for the phrase can be added later from the phrase detail view.
 */
export function WordPhraseLinkDialog({
  open,
  onOpenChange,
  wordId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wordId: Id<'studyWords'>;
}) {
  const createPhrase = useMutation(api.study.createPhrase);
  const linkWordToPhrase = useMutation(api.study.linkWordToPhrase);

  const [arabicText, setArabicText] = useState('');
  const [transliteration, setTransliteration] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = useMemo(() => arabicText.trim().length > 0, [arabicText]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSaving(true);
    try {
      const phraseId = await createPhrase({
        arabicText: arabicText.trim(),
        transliteration: transliteration.trim() || undefined,
      });
      await linkWordToPhrase({ wordId, phraseId });
      onOpenChange(false);
      setArabicText('');
      setTransliteration('');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Example Phrase</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="example_phrase_arabic">Arabic Phrase</Label>
            <Input
              id="example_phrase_arabic"
              value={arabicText}
              onChange={(e) => setArabicText(e.target.value)}
              className="font-arabic text-right"
              dir="rtl"
              placeholder="…"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="example_phrase_translit">Transliteration (optional)</Label>
            <Input
              id="example_phrase_translit"
              value={transliteration}
              onChange={(e) => setTransliteration(e.target.value)}
              placeholder="…"
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

