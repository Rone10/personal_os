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

/**
 * Edit word metadata (Arabic text, transliteration, root).
 * Meanings, references and notes are edited via their own dialogs.
 */
export function WordEditDialog({
  open,
  onOpenChange,
  word,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  word: Doc<'studyWords'>;
}) {
  const updateWord = useMutation(api.study.updateWord);

  const [arabicText, setArabicText] = useState(word.arabicText);
  const [transliteration, setTransliteration] = useState(word.transliteration ?? '');
  const [root, setRoot] = useState(word.root ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setArabicText(word.arabicText);
    setTransliteration(word.transliteration ?? '');
    setRoot(word.root ?? '');
  }, [open, word]);

  const isDirty = useMemo(() => {
    return (
      arabicText !== word.arabicText ||
      transliteration !== (word.transliteration ?? '') ||
      root !== (word.root ?? '')
    );
  }, [arabicText, root, transliteration, word]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty) return;

    setIsSaving(true);
    try {
      await updateWord({
        id: word._id,
        arabicText: arabicText.trim(),
        transliteration: transliteration.trim() || null,
        root: root.trim() || null,
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
          <DialogTitle>Edit Word</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit_word_arabic">Arabic Word</Label>
            <Input
              id="edit_word_arabic"
              value={arabicText}
              onChange={(e) => setArabicText(e.target.value)}
              className="font-arabic text-lg text-right"
              dir="rtl"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit_word_translit">Transliteration</Label>
              <Input
                id="edit_word_translit"
                value={transliteration}
                onChange={(e) => setTransliteration(e.target.value)}
                placeholder="kataba"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_word_root">Root</Label>
              <Input id="edit_word_root" value={root} onChange={(e) => setRoot(e.target.value)} placeholder="k-t-b" />
            </div>
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

