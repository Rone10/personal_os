"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { BookText, Edit2, Trash2, Loader2, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityType, ViewType } from "../StudyPageClient";
import RichTextViewer from "@/components/rich-text/RichTextViewer";
import type { JSONContent, EntityReferenceAttributes } from "@/components/rich-text/types";

interface BookDetailProps {
  bookId: string;
  onNavigate: (
    view: ViewType,
    type?: EntityType,
    id?: string,
    parent?: string
  ) => void;
  onEdit: () => void;
  onAddChapter: () => void;
}

export default function BookDetail({
  bookId,
  onNavigate,
  onEdit,
  onAddChapter,
}: BookDetailProps) {
  const book = useQuery(api.study.books.getBook, {
    id: bookId as Id<"books">,
  });
  const chapters = useQuery(api.study.books.listChapters, {
    bookId: bookId as Id<"books">,
  });
  const deleteBook = useMutation(api.study.books.removeBook);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (book === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (book === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Book not found</p>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteBook({ id: bookId as Id<"books"> });
    onNavigate("books");
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

  const hasRichContent = book.descriptionJson || book.description;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
            <BookText className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {book.title}
            </h1>
            {book.author && (
              <p className="text-slate-500">by {book.author}</p>
            )}
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

      {/* Description */}
      {hasRichContent && (
        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          {book.descriptionJson ? (
            <RichTextViewer
              content={book.descriptionJson as JSONContent}
              onEntityClick={handleEntityClick}
            />
          ) : (
            <p className="text-slate-600 dark:text-slate-400">
              {book.description}
            </p>
          )}
        </div>
      )}

      {/* Chapters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Chapters
          </h2>
          <Button variant="outline" size="sm" onClick={onAddChapter}>
            <Plus className="h-4 w-4 mr-1" />
            Add Chapter
          </Button>
        </div>

        {chapters === undefined ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
            <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No chapters in this book yet</p>
            <Button variant="outline" className="mt-4" onClick={onAddChapter}>
              <Plus className="h-4 w-4 mr-1" />
              Add First Chapter
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {chapters.map((chapter, index) => (
              <div
                key={chapter._id}
                onClick={() =>
                  onNavigate("books", "chapter", chapter._id, bookId)
                }
                className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-rose-300 dark:hover:border-rose-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-rose-100 dark:bg-rose-900/30 rounded-full text-sm font-medium text-rose-600 dark:text-rose-400">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-slate-100">
                      {chapter.title}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
