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
 * “Quick capture” for a new word.
 *
 * Rationale:
 * - When capturing a word, meaning is usually known/available immediately.
 * - Example phrase is optional and stored separately (linked to the word).
 */
export function WordFormDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (wordId: string) => void;
}) {
  const createWord = useMutation(api.study.createWord);
  const createMeaning = useMutation(api.study.createMeaning);
  const createPhrase = useMutation(api.study.createPhrase);
  const linkWordToPhrase = useMutation(api.study.linkWordToPhrase);

  const [arabicText, setArabicText] = useState('');
  const [transliteration, setTransliteration] = useState('');
  const [root, setRoot] = useState('');
  const [meaning, setMeaning] = useState('');
  const [examplePhraseArabic, setExamplePhraseArabic] = useState('');
  const [examplePhraseTranslit, setExamplePhraseTranslit] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = useMemo(() => arabicText.trim() && meaning.trim(), [arabicText, meaning]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSaving(true);
    try {
      const wordId = await createWord({
        arabicText: arabicText.trim(),
        transliteration: transliteration.trim() || undefined,
        root: root.trim() || undefined,
      });

      await createMeaning({
        ownerType: 'word',
        ownerId: wordId,
        text: meaning.trim(),
        language: 'en',
        isPrimary: true,
      });

      if (examplePhraseArabic.trim()) {
        const phraseId = await createPhrase({
          arabicText: examplePhraseArabic.trim(),
          transliteration: examplePhraseTranslit.trim() || undefined,
        });
        await linkWordToPhrase({ wordId, phraseId });
      }

      onCreated(wordId);
      onOpenChange(false);

      // Reset the form for next use.
      setArabicText('');
      setTransliteration('');
      setRoot('');
      setMeaning('');
      setExamplePhraseArabic('');
      setExamplePhraseTranslit('');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Word</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="word_arabic">Arabic Word</Label>
            <Input
              id="word_arabic"
              value={arabicText}
              onChange={(e) => setArabicText(e.target.value)}
              required
              className="font-arabic text-lg text-right"
              dir="rtl"
              placeholder="كَتَبَ"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="word_translit">Transliteration (optional)</Label>
              <Input
                id="word_translit"
                value={transliteration}
                onChange={(e) => setTransliteration(e.target.value)}
                placeholder="kataba"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="word_root">Root (optional)</Label>
              <Input id="word_root" value={root} onChange={(e) => setRoot(e.target.value)} placeholder="k-t-b" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="word_meaning">Meaning / Translation</Label>
            <Textarea
              id="word_meaning"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              required
              placeholder="To write"
            />
            <div className="text-xs text-slate-500">Saved as the word’s primary meaning (you can add more later).</div>
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3 space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Optional Example Phrase</div>
            <div className="space-y-2">
              <Label htmlFor="phrase_arabic">Arabic Phrase</Label>
              <Input
                id="phrase_arabic"
                value={examplePhraseArabic}
                onChange={(e) => setExamplePhraseArabic(e.target.value)}
                className="font-arabic text-right"
                dir="rtl"
                placeholder="... وَكَتَبَ ..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phrase_translit">Transliteration (optional)</Label>
              <Input
                id="phrase_translit"
                value={examplePhraseTranslit}
                onChange={(e) => setExamplePhraseTranslit(e.target.value)}
                placeholder="... wa kataba ..."
              />
            </div>
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

