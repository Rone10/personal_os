'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

type RefType = 'quran' | 'hadith' | 'other';

function toNumberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

/**
 * Create or edit a reference for a meaning.
 *
 * References are attached to meanings (not directly to words/phrases/verses),
 * so you can have multiple meanings each with different references/sources.
 */
export function ReferenceDialog({
  open,
  onOpenChange,
  meaningId,
  initialReference,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meaningId: Id<'studyMeanings'>;
  initialReference?: Doc<'studyReferences'> | null;
}) {
  const createReference = useMutation(api.study.createReference);
  const updateReference = useMutation(api.study.updateReference);

  const [type, setType] = useState<RefType>('quran');

  const [qSurah, setQSurah] = useState('');
  const [qStart, setQStart] = useState('');
  const [qEnd, setQEnd] = useState('');

  const [hCollection, setHCollection] = useState('');
  const [hNumber, setHNumber] = useState('');
  const [hBook, setHBook] = useState('');
  const [hChapter, setHChapter] = useState('');
  const [hGrade, setHGrade] = useState('');
  const [hNarrator, setHNarrator] = useState('');

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    const t: RefType = (initialReference?.type as RefType) ?? 'quran';
    setType(t);

    setQSurah(initialReference?.quranSurah?.toString() ?? '');
    setQStart(initialReference?.quranAyahStart?.toString() ?? '');
    setQEnd(initialReference?.quranAyahEnd?.toString() ?? '');

    setHCollection(initialReference?.hadithCollection ?? '');
    setHNumber(initialReference?.hadithNumber ?? '');
    setHBook(initialReference?.hadithBook ?? '');
    setHChapter(initialReference?.hadithChapter ?? '');
    setHGrade(initialReference?.hadithGrade ?? '');
    setHNarrator(initialReference?.hadithNarrator ?? '');

    setTitle(initialReference?.title ?? '');
    setUrl(initialReference?.url ?? '');
    setNotes(initialReference?.notes ?? '');
  }, [initialReference, open]);

  const canSubmit = useMemo(() => {
    if (type === 'quran') return Boolean(qSurah.trim() && qStart.trim());
    if (type === 'hadith') return Boolean(hCollection.trim() && hNumber.trim());
    return true;
  }, [hCollection, hNumber, qStart, qSurah, type]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSaving(true);
    try {
      if (!initialReference) {
        await createReference({
          meaningId,
          type,
          quranSurah: type === 'quran' ? (toNumberOrNull(qSurah) ?? undefined) : undefined,
          quranAyahStart: type === 'quran' ? (toNumberOrNull(qStart) ?? undefined) : undefined,
          quranAyahEnd: type === 'quran' ? (toNumberOrNull(qEnd) ?? undefined) : undefined,
          hadithCollection: type === 'hadith' ? hCollection.trim() : undefined,
          hadithNumber: type === 'hadith' ? hNumber.trim() : undefined,
          hadithBook: type === 'hadith' ? hBook.trim() || undefined : undefined,
          hadithChapter: type === 'hadith' ? hChapter.trim() || undefined : undefined,
          hadithGrade: type === 'hadith' ? hGrade.trim() || undefined : undefined,
          hadithNarrator: type === 'hadith' ? hNarrator.trim() || undefined : undefined,
          title: title.trim() || undefined,
          url: url.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await updateReference({
          id: initialReference._id,
          type,
          quranSurah: type === 'quran' ? (toNumberOrNull(qSurah) ?? null) : null,
          quranAyahStart: type === 'quran' ? (toNumberOrNull(qStart) ?? null) : null,
          quranAyahEnd: type === 'quran' ? toNumberOrNull(qEnd) : null,
          hadithCollection: type === 'hadith' ? hCollection.trim() : null,
          hadithNumber: type === 'hadith' ? hNumber.trim() : null,
          hadithBook: type === 'hadith' ? hBook.trim() || null : null,
          hadithChapter: type === 'hadith' ? hChapter.trim() || null : null,
          hadithGrade: type === 'hadith' ? hGrade.trim() || null : null,
          hadithNarrator: type === 'hadith' ? hNarrator.trim() || null : null,
          title: title.trim() || null,
          url: url.trim() || null,
          notes: notes.trim() || null,
        });
      }

      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialReference ? 'Edit Reference' : 'Add Reference'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ref_type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as RefType)}>
              <SelectTrigger id="ref_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quran">quran</SelectItem>
                <SelectItem value="hadith">hadith</SelectItem>
                <SelectItem value="other">other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'quran' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ref_q_surah">Surah</Label>
                <Input id="ref_q_surah" value={qSurah} onChange={(e) => setQSurah(e.target.value)} inputMode="numeric" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ref_q_start">Ayah Start</Label>
                <Input id="ref_q_start" value={qStart} onChange={(e) => setQStart(e.target.value)} inputMode="numeric" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ref_q_end">Ayah End (optional)</Label>
                <Input id="ref_q_end" value={qEnd} onChange={(e) => setQEnd(e.target.value)} inputMode="numeric" />
              </div>
            </div>
          ) : null}

          {type === 'hadith' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ref_h_collection">Collection</Label>
                  <Input
                    id="ref_h_collection"
                    value={hCollection}
                    onChange={(e) => setHCollection(e.target.value)}
                    required
                    placeholder="Bukhari / Muslim / Abu Dawud…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ref_h_number">Hadith Number</Label>
                  <Input id="ref_h_number" value={hNumber} onChange={(e) => setHNumber(e.target.value)} required placeholder="1" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ref_h_book">Book (optional)</Label>
                  <Input id="ref_h_book" value={hBook} onChange={(e) => setHBook(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ref_h_chapter">Chapter (optional)</Label>
                  <Input id="ref_h_chapter" value={hChapter} onChange={(e) => setHChapter(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ref_h_grade">Grade (optional)</Label>
                  <Input id="ref_h_grade" value={hGrade} onChange={(e) => setHGrade(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ref_h_narrator">Narrator (optional)</Label>
                  <Input id="ref_h_narrator" value={hNarrator} onChange={(e) => setHNarrator(e.target.value)} />
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ref_title">Title (optional)</Label>
              <Input id="ref_title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Commentary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref_url">URL (optional)</Label>
              <Input id="ref_url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ref_notes">Notes (optional)</Label>
            <Textarea id="ref_notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Extra context…" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

