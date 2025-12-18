'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { StudyDetailShell } from './StudyDetailShell';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { MeaningDialog } from './MeaningDialog';
import { ReferenceDialog } from './ReferenceDialog';
import { NoteDialog } from './NoteDialog';
import { PhraseEditDialog } from './PhraseEditDialog';
import { formatReferenceLabel } from './format';
import { useRouter } from 'next/navigation';

/**
 * Phrase detail view.
 */
export function PhraseDetail({ id }: { id: string }) {
  const router = useRouter();
  const detail = useQuery(api.study.getPhraseDetail, { id: id as Id<'studyPhrases'> });
  const quranOverlap = useQuery(api.study.findOverlappingQuranCapturesBatch, {
    refs:
      detail === undefined || detail === null
        ? []
        : detail.meanings
            .flatMap((m) => m.references)
            .filter((r) => r.type === 'quran' && r.quranSurah !== undefined && r.quranAyahStart !== undefined)
            .map((r) => ({
              refId: r._id,
              surah: r.quranSurah!,
              ayahStart: r.quranAyahStart!,
              ayahEnd: r.quranAyahEnd ?? undefined,
            })),
  });
  const deletePhrase = useMutation(api.study.deletePhrase);
  const deleteMeaning = useMutation(api.study.deleteMeaning);
  const deleteReference = useMutation(api.study.deleteReference);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isMeaningOpen, setIsMeaningOpen] = useState(false);
  const [meaningToEdit, setMeaningToEdit] = useState<Doc<'studyMeanings'> | null>(null);

  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [referenceMeaningId, setReferenceMeaningId] = useState<Id<'studyMeanings'> | null>(null);
  const [referenceToEdit, setReferenceToEdit] = useState<Doc<'studyReferences'> | null>(null);

  if (detail === undefined) {
    return (
      <StudyDetailShell title="Loading…">
        <div className="text-sm text-slate-500">Fetching phrase detail.</div>
      </StudyDetailShell>
    );
  }

  if (detail === null) {
    return (
      <StudyDetailShell title="Not available">
        <div className="text-sm text-slate-500">Sign in required, or this item no longer exists.</div>
      </StudyDetailShell>
    );
  }

  const { phrase, meanings, note } = detail;
  const phraseId = phrase._id as Id<'studyPhrases'>;

  return (
    <StudyDetailShell
      title={
        <div className="font-arabic text-right" dir="rtl">
          {phrase.arabicText}
        </div>
      }
      subtitle={phrase.transliteration ? <span className="text-xs">({phrase.transliteration})</span> : undefined}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsNoteOpen(true)}>
            Notes
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-900/20"
            onClick={async () => {
              if (!confirm('Delete this phrase and all its meanings/references/notes?')) return;
              await deletePhrase({ id: phraseId });
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      }
    >
      <section className="space-y-3">
        <div>
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Meanings</div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setMeaningToEdit(null);
                setIsMeaningOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="mt-2 space-y-3">
            {meanings.length === 0 ? (
              <div className="text-sm text-slate-500">No meanings yet.</div>
            ) : (
              meanings.map(({ meaning, references }) => (
                <div key={meaning._id} className="rounded-md border border-slate-200 dark:border-slate-800 p-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm whitespace-pre-wrap">{meaning.text}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        {meaning.isPrimary ? <span className="text-emerald-600">Primary</span> : null}
                        {meaning.language ? <span className="font-mono">{meaning.language}</span> : null}
                      </div>
                    </div>
                    <div className="shrink-0 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMeaningToEdit(meaning);
                          setIsMeaningOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReferenceMeaningId(meaning._id);
                          setReferenceToEdit(null);
                          setIsReferenceOpen(true);
                        }}
                      >
                        Add Ref
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-900/20"
                        onClick={async () => {
                          if (!confirm('Delete this meaning and its references?')) return;
                          await deleteMeaning({ id: meaning._id });
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">References</div>
                    <div className="mt-2 space-y-2">
                      {references.length === 0 ? (
                        <div className="text-sm text-slate-500">—</div>
                      ) : (
                        references.map((ref) => (
                          <div
                            key={ref._id}
                            className="flex items-start justify-between gap-3 rounded-md border border-slate-200 dark:border-slate-800 p-2"
                          >
                            <div className="min-w-0">
                              <div className="text-sm">{formatReferenceLabel(ref)}</div>
                              {ref.url ? (
                                <a href={ref.url} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline">
                                  {ref.url}
                                </a>
                              ) : null}

                              {ref.type === 'quran' ? (
                                <div className="mt-2 space-y-2">
                                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Saved Captures</div>
                                  {quranOverlap === undefined ? (
                                    <div className="text-sm text-slate-500">Loading…</div>
                                  ) : (quranOverlap?.[ref._id] ?? []).length === 0 ? (
                                    <div className="text-sm text-slate-500">—</div>
                                  ) : (
                                    <div className="space-y-2">
                                      {(quranOverlap?.[ref._id] ?? []).map((c) => (
                                        <div
                                          key={c._id}
                                          className="flex items-start justify-between gap-3 rounded-md border border-slate-200 dark:border-slate-800 p-2"
                                        >
                                          <div className="min-w-0">
                                            <div className="text-xs font-mono text-slate-600 dark:text-slate-300">
                                              {c.surah}:{c.ayahStart}
                                              {c.ayahEnd && c.ayahEnd !== c.ayahStart ? `–${c.ayahEnd}` : ''}
                                            </div>
                                            <div className="font-arabic text-right text-sm mt-1" dir="rtl">
                                              {c.arabicText}
                                            </div>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => router.push(`/study?type=verse&id=${c._id}`)}
                                          >
                                            Open
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                            <div className="shrink-0 flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReferenceMeaningId(meaning._id);
                                  setReferenceToEdit(ref);
                                  setIsReferenceOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-900/20"
                                onClick={async () => {
                                  if (!confirm('Delete this reference?')) return;
                                  await deleteReference({ id: ref._id });
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</div>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
            {note?.content ?? '—'}
          </div>
        </div>
      </section>

      <PhraseEditDialog open={isEditOpen} onOpenChange={setIsEditOpen} phrase={phrase} />
      <NoteDialog open={isNoteOpen} onOpenChange={setIsNoteOpen} ownerType="phrase" ownerId={phraseId} initialContent={note?.content ?? ''} />
      <MeaningDialog open={isMeaningOpen} onOpenChange={setIsMeaningOpen} ownerType="phrase" ownerId={phraseId} initialMeaning={meaningToEdit} />
      {referenceMeaningId ? (
        <ReferenceDialog open={isReferenceOpen} onOpenChange={setIsReferenceOpen} meaningId={referenceMeaningId} initialReference={referenceToEdit} />
      ) : null}
    </StudyDetailShell>
  );
}
