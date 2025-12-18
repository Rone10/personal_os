'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type OwnerType = 'word' | 'phrase' | 'quran_passage';
type SourceKind = 'quran_translation' | 'tafsir' | 'hadith' | 'dictionary' | 'other';

function isTruthy(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

/**
 * Create or edit a meaning/translation for a Study entity.
 *
 * Notes:
 * - Meanings can be “primary” per entity; setting one primary unsets others.
 * - Sources are optional; user can reuse previous sources (autofill) or enter new.
 */
export function MeaningDialog({
  open,
  onOpenChange,
  ownerType,
  ownerId,
  initialMeaning,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerType: OwnerType;
  ownerId: string;
  initialMeaning?: Doc<'studyMeanings'> | null;
}) {
  const sources = useQuery(api.study.listSources, {});
  const upsertSource = useMutation(api.study.upsertSource);
  const createMeaning = useMutation(api.study.createMeaning);
  const updateMeaning = useMutation(api.study.updateMeaning);

  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en');
  const [isPrimary, setIsPrimary] = useState(true);

  const [sourceKind, setSourceKind] = useState<SourceKind | ''>('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceAuthor, setSourceAuthor] = useState('');
  const [clearExistingSource, setClearExistingSource] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const existingSource = useMemo(() => {
    if (!initialMeaning?.sourceId || sources === undefined) return null;
    return sources.find((s) => s._id === initialMeaning.sourceId) ?? null;
  }, [initialMeaning?.sourceId, sources]);

  useEffect(() => {
    if (!open) return;

    setText(initialMeaning?.text ?? '');
    setLanguage(initialMeaning?.language ?? 'en');
    setIsPrimary(initialMeaning?.isPrimary ?? true);

    setClearExistingSource(false);
    if (existingSource) {
      setSourceKind(existingSource.kind);
      setSourceTitle(existingSource.title ?? '');
      setSourceUrl(existingSource.url ?? '');
      setSourceAuthor(existingSource.author ?? '');
    } else {
      setSourceKind('');
      setSourceTitle('');
      setSourceUrl('');
      setSourceAuthor('');
    }
  }, [existingSource, initialMeaning, open]);

  const sourceSuggestions = useMemo(() => {
    if (sources === undefined || !sourceKind) return [];
    return sources.filter((s) => s.kind === sourceKind).slice(0, 6);
  }, [sourceKind, sources]);

  const canSubmit = useMemo(() => text.trim().length > 0, [text]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSaving(true);
    try {
      let sourceId: Id<'studySources'> | undefined | null = undefined;

      if (clearExistingSource) {
        sourceId = null;
      } else if (sourceKind && (isTruthy(sourceTitle) || isTruthy(sourceUrl) || isTruthy(sourceAuthor))) {
        sourceId = await upsertSource({
          kind: sourceKind as SourceKind,
          title: sourceTitle.trim() || undefined,
          url: sourceUrl.trim() || undefined,
          author: sourceAuthor.trim() || undefined,
        });
      } else if (initialMeaning?.sourceId) {
        // Preserve existing source if the user did not clear and did not enter a new one.
        sourceId = initialMeaning.sourceId;
      }

      if (initialMeaning) {
        await updateMeaning({
          id: initialMeaning._id,
          text: text.trim(),
          language: language.trim() || null,
          sourceId: sourceId === undefined ? undefined : sourceId,
          isPrimary,
        });
      } else {
        await createMeaning({
          ownerType,
          ownerId,
          text: text.trim(),
          language: language.trim() || undefined,
          sourceId: sourceId === undefined || sourceId === null ? undefined : sourceId,
          isPrimary,
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
          <DialogTitle>{initialMeaning ? 'Edit Meaning' : 'Add Meaning'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meaning_text">Text</Label>
            <Textarea id="meaning_text" value={text} onChange={(e) => setText(e.target.value)} required className="min-h-28" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="meaning_lang">Language (optional)</Label>
              <Input id="meaning_lang" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" />
            </div>
            <div className="flex items-end gap-2">
              <Checkbox id="meaning_primary" checked={isPrimary} onCheckedChange={(v) => setIsPrimary(Boolean(v))} />
              <Label htmlFor="meaning_primary" className="cursor-pointer">
                Primary meaning
              </Label>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Source (optional)</div>
              {initialMeaning?.sourceId ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="clear_source"
                    checked={clearExistingSource}
                    onCheckedChange={(v) => setClearExistingSource(Boolean(v))}
                  />
                  <Label htmlFor="clear_source" className="cursor-pointer text-xs text-slate-500">
                    Clear source
                  </Label>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="source_kind">Kind</Label>
                <Select
                  value={sourceKind || undefined}
                  onValueChange={(v) => setSourceKind(v === '__none__' ? '' : (v as SourceKind))}
                  disabled={clearExistingSource}
                >
                  <SelectTrigger id="source_kind">
                    <SelectValue placeholder="(none)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">(none)</SelectItem>
                    <SelectItem value="quran_translation">quran_translation</SelectItem>
                    <SelectItem value="tafsir">tafsir</SelectItem>
                    <SelectItem value="hadith">hadith</SelectItem>
                    <SelectItem value="dictionary">dictionary</SelectItem>
                    <SelectItem value="other">other</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-slate-500">Leave empty if you don’t want to attach a source.</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source_author">Author (optional)</Label>
                <Input
                  id="source_author"
                  value={sourceAuthor}
                  onChange={(e) => setSourceAuthor(e.target.value)}
                  placeholder="Translator / Author"
                  disabled={clearExistingSource}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source_title">Title (optional)</Label>
              <Input
                id="source_title"
                value={sourceTitle}
                onChange={(e) => setSourceTitle(e.target.value)}
                placeholder="e.g. Sahih International"
                disabled={clearExistingSource}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source_url">URL (optional)</Label>
              <Input
                id="source_url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://…"
                disabled={clearExistingSource}
              />
            </div>

            {sourceSuggestions.length > 0 && !clearExistingSource ? (
              <div>
                <div className="text-xs text-slate-500 mb-2">Recent sources ({sourceKind})</div>
                <div className="flex flex-wrap gap-2">
                  {sourceSuggestions.map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      className={cn(
                        'text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950',
                      )}
                      onClick={() => {
                        setSourceTitle(s.title ?? '');
                        setSourceUrl(s.url ?? '');
                        setSourceAuthor(s.author ?? '');
                      }}
                    >
                      {s.title ?? s.url ?? 'Untitled'}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
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
