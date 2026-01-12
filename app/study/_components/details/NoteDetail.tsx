"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useCallback } from "react";
import {
  StickyNote,
  Edit2,
  Trash2,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntityType, ViewType } from "../StudyPageClient";
import NoteEditor, { InlineReference } from "../editor/NoteEditor";
import NoteRenderer from "../editor/NoteRenderer";

interface NoteDetailProps {
  noteId: string;
  onNavigate: (
    view: ViewType,
    type?: EntityType,
    id?: string,
    parent?: string
  ) => void;
}

export default function NoteDetail({ noteId, onNavigate }: NoteDetailProps) {
  const note = useQuery(api.study.notes.getById, {
    id: noteId as Id<"studyNotes">,
  });
  const updateNote = useMutation(api.study.notes.update);
  const deleteNote = useMutation(api.study.notes.remove);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [references, setReferences] = useState<InlineReference[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Handle reference clicks - must be defined before any conditional returns
  const handleReferenceClick = useCallback((type: string, id: string) => {
    const viewMap: Record<string, ViewType> = {
      word: "words",
      verse: "verses",
      hadith: "hadiths",
      root: "roots",
      lesson: "courses",
      chapter: "books",
    };
    const view = viewMap[type];
    if (view) {
      onNavigate(view, type as EntityType, id);
    }
  }, [onNavigate]);

  useEffect(() => {
    if (note) {
      setTitle(note.title ?? "");
      setContent(note.content ?? "");
      // Map note references to InlineReference format
      setReferences(
        (note.references ?? []).map(ref => ({
          targetType: ref.targetType as InlineReference["targetType"],
          targetId: ref.targetId,
          startOffset: ref.startOffset,
          endOffset: ref.endOffset,
          displayText: ref.displayText,
        }))
      );
    }
  }, [note]);

  if (note === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (note === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Note not found</p>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateNote({
        id: noteId as Id<"studyNotes">,
        title: title || undefined,
        content,
        references: references.map(ref => ({
          targetType: ref.targetType,
          targetId: ref.targetId,
          startOffset: ref.startOffset,
          endOffset: ref.endOffset,
          displayText: ref.displayText,
        })),
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    await deleteNote({ id: noteId as Id<"studyNotes"> });
    onNavigate("notes");
  };

  const handleCancel = () => {
    setTitle(note.title ?? "");
    setContent(note.content ?? "");
    setReferences(
      (note.references ?? []).map(ref => ({
        targetType: ref.targetType as InlineReference["targetType"],
        targetId: ref.targetId,
        startOffset: ref.startOffset,
        endOffset: ref.endOffset,
        displayText: ref.displayText,
      }))
    );
    setIsEditing(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <StickyNote className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          {isEditing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              className="text-xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto"
            />
          ) : (
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {note.title ?? "Untitled Note"}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isEditing ? (
          <NoteEditor
            content={content}
            references={references}
            onContentChange={setContent}
            onReferencesChange={setReferences}
            className="h-full"
          />
        ) : (
          <div className="prose dark:prose-invert max-w-none">
            {note.content ? (
              <NoteRenderer
                content={note.content}
                references={(note.references ?? []).map(ref => ({
                  targetType: ref.targetType as InlineReference["targetType"],
                  targetId: ref.targetId,
                  startOffset: ref.startOffset,
                  endOffset: ref.endOffset,
                  displayText: ref.displayText,
                }))}
                onReferenceClick={handleReferenceClick}
              />
            ) : (
              <p className="text-slate-400 italic">
                No content. Click Edit to start writing.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400">
        {note.updatedAt && (
          <span>Last updated: {formatDate(note.updatedAt)}</span>
        )}
      </div>
    </div>
  );
}
