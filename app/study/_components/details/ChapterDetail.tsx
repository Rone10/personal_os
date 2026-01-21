"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import {
  FileText,
  Edit2,
  Trash2,
  Loader2,
  ChevronLeft,
  BookText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityType, ViewType } from "../StudyPageClient";
import RichTextViewer from "@/components/rich-text/RichTextViewer";
import type { JSONContent, EntityReferenceAttributes } from "@/components/rich-text/types";

interface ChapterDetailProps {
  chapterId: string;
  bookId: string;
  onNavigate: (
    view: ViewType,
    type?: EntityType,
    id?: string,
    parent?: string
  ) => void;
  onEdit: () => void;
}

export default function ChapterDetail({
  chapterId,
  bookId,
  onNavigate,
  onEdit,
}: ChapterDetailProps) {
  const chapter = useQuery(api.study.books.getChapter, {
    id: chapterId as Id<"chapters">,
  });
  const book = useQuery(api.study.books.getBook, {
    id: bookId as Id<"books">,
  });
  const deleteChapter = useMutation(api.study.books.removeChapter);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (chapter === undefined || book === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (chapter === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Chapter not found</p>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteChapter({ id: chapterId as Id<"chapters"> });
    onNavigate("books", "book", bookId);
  };

  const handleEntityClick = (attrs: EntityReferenceAttributes) => {
    // Map entity types to navigation views
    const typeToView: Record<string, ViewType> = {
      word: "words",
      verse: "verses",
      hadith: "hadiths",
      root: "roots",
      tag: "tags",
      course: "courses",
      book: "books",
      note: "notes",
      lesson: "courses",
      chapter: "books",
    };

    const view = typeToView[attrs.targetType];
    if (view) {
      onNavigate(view, attrs.targetType as EntityType, attrs.targetId);
    }
  };

  const hasContent = chapter.contentJson || chapter.content;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Back to Book */}
      <div
        className="flex items-center gap-2 text-sm text-slate-500 mb-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300"
        onClick={() => onNavigate("books", "book", bookId)}
      >
        <ChevronLeft className="h-4 w-4" />
        <BookText className="h-4 w-4" />
        <span>{book?.title ?? "Book"}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
            <FileText className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {chapter.title}
            </h1>
            <p className="text-slate-500">Chapter {chapter.order + 1}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={handleDelete}>
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
        </div>
      </div>

      {/* Content */}
      {hasContent ? (
        <div className="prose dark:prose-invert max-w-none">
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            {chapter.contentJson ? (
              <RichTextViewer
                content={chapter.contentJson as JSONContent}
                onEntityClick={handleEntityClick}
              />
            ) : (
              <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {chapter.content}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No content yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Edit this chapter to add content
          </p>
          <Button variant="outline" className="mt-4" onClick={onEdit}>
            <Edit2 className="h-4 w-4 mr-1" />
            Add Content
          </Button>
        </div>
      )}
    </div>
  );
}
