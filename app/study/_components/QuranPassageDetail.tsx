'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { StudyDetailShell } from './StudyDetailShell';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { QuranPassageEditDialog } from './QuranPassageEditDialog';
import { MeaningDialog } from './MeaningDialog';
import { ReferenceDialog } from './ReferenceDialog';
import { NoteDialog } from './NoteDialog';
import { formatReferenceLabel } from './format';

/**
 * Quran passage capture detail view.
 */
export function QuranPassageDetail({ id }: { id: string }) {
  const detail = useQuery(api.study.getQuranPassageDetail, { id: id as Id<'studyQuranPassages'> });
  const deleteQuranPassage = useMutation(api.study.deleteQuranPassage);
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
        <div className="text-sm text-slate-500">Fetching passage detail.</div>
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

  const { passage, meanings, note } = detail;
  const passageId = passage._id as Id<'studyQuranPassages'>;
  const ayahRange =
    passage.ayahEnd && passage.ayahEnd !== passage.ayahStart
      ? `${passage.ayahStart}–${passage.ayahEnd}`
      : `${passage.ayahStart}`;

  return (
    <StudyDetailShell
      title={
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">Quran</span>
          <span className="font-mono text-sm text-slate-500">
            {passage.surah}:{ayahRange}
          </span>
        </div>
      }
      subtitle={
        <div className="font-arabic text-right" dir="rtl">
          {passage.arabicText}
        </div>
      }
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
              if (!confirm('Delete this verse capture and all its translations/notes?')) return;
              await deleteQuranPassage({ id: passageId });
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
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Translations / Meanings</div>
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
              <div className="text-sm text-slate-500">No translations saved yet.</div>
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
                          if (!confirm('Delete this translation and its references?')) return;
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

      <QuranPassageEditDialog open={isEditOpen} onOpenChange={setIsEditOpen} passage={passage} />
      <NoteDialog open={isNoteOpen} onOpenChange={setIsNoteOpen} ownerType="quran_passage" ownerId={passageId} initialContent={note?.content ?? ''} />
      <MeaningDialog open={isMeaningOpen} onOpenChange={setIsMeaningOpen} ownerType="quran_passage" ownerId={passageId} initialMeaning={meaningToEdit} />
      {referenceMeaningId ? (
        <ReferenceDialog open={isReferenceOpen} onOpenChange={setIsReferenceOpen} meaningId={referenceMeaningId} initialReference={referenceToEdit} />
      ) : null}
    </StudyDetailShell>
  );
}
