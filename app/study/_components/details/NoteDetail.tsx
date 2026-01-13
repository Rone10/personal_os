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
import NoteRenderer from "../editor/NoteRenderer";
import { InlineReference } from "../editor/NoteEditor";
import RichTextEditor from "@/components/rich-text/RichTextEditor";
import RichTextViewer from "@/components/rich-text/RichTextViewer";
import {
  extractReferences,
  type JSONContent,
  type EntityReferenceAttributes,
} from "@/components/rich-text/types";

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
  const [contentJson, setContentJson] = useState<JSONContent | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Handle reference clicks for both rich text and legacy references
  const handleReferenceClick = useCallback((type: string, id: string) => {
    const viewMap: Record<string, ViewType> = {
      word: "words",
      verse: "verses",
      hadith: "hadiths",
      root: "roots",
      lesson: "courses",
      chapter: "books",
      tag: "tags",
      course: "courses",
      book: "books",
      note: "notes",
    };
    const view = viewMap[type];
    if (view) {
      onNavigate(view, type as EntityType, id);
    }
  }, [onNavigate]);

  // Handle entity click from RichTextViewer
  const handleEntityClick = useCallback((ref: EntityReferenceAttributes) => {
    handleReferenceClick(ref.targetType, ref.targetId);
  }, [handleReferenceClick]);

  useEffect(() => {
    if (note) {
      setTitle(note.title ?? "");
      // Use contentJson if available, otherwise create basic structure from plain text
      if (note.contentJson) {
        setContentJson(note.contentJson as JSONContent);
      } else if (note.content) {
        // Convert plain text to basic Tiptap JSON for editing
        setContentJson({
          type: "doc",
          content: note.content.split("\n").map((line) => ({
            type: "paragraph",
            content: line ? [{ type: "text", text: line }] : [],
          })),
        });
      } else {
        setContentJson(undefined);
      }
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

  // Extract plain text from Tiptap JSON for backwards compatibility
  const getPlainText = (json: JSONContent | undefined): string => {
    if (!json) return "";

    const extractText = (node: JSONContent): string => {
      if (node.type === "text") {
        return node.text || "";
      }
      if (node.content) {
        return node.content.map(extractText).join("");
      }
      return "";
    };

    return extractText(json);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const plainText = getPlainText(contentJson);
      const extractedRefs = contentJson ? extractReferences(contentJson) : [];

      await updateNote({
        id: noteId as Id<"studyNotes">,
        title: title || undefined,
        content: plainText,
        contentJson: contentJson,
        extractedReferences: extractedRefs.length > 0 ? extractedRefs : undefined,
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
    if (note.contentJson) {
      setContentJson(note.contentJson as JSONContent);
    } else if (note.content) {
      setContentJson({
        type: "doc",
        content: note.content.split("\n").map((line) => ({
          type: "paragraph",
          content: line ? [{ type: "text", text: line }] : [],
        })),
      });
    } else {
      setContentJson(undefined);
    }
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

  // Check if note has rich text content
  const hasRichContent = !!note.contentJson;

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
          <RichTextEditor
            value={contentJson}
            onChange={setContentJson}
            enableEntityReferences={true}
            currentNoteId={noteId}
            minHeight="300px"
            placeholder="Start writing... Press Ctrl+K to insert a reference."
          />
        ) : (
          <div className="prose dark:prose-invert max-w-none">
            {hasRichContent ? (
              <RichTextViewer
                content={note.contentJson as JSONContent}
                onEntityClick={handleEntityClick}
              />
            ) : note.content ? (
              <NoteRenderer
                content={note.content}
                references={(note.references ?? []).map((ref) => ({
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
