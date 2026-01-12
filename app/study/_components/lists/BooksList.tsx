"use client";

import { Plus, BookText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Book {
  _id: string;
  title: string;
  author?: string;
  description?: string;
}

interface Chapter {
  _id: string;
  bookId: string;
  title: string;
  order: number;
}

interface BooksListProps {
  books: Book[];
  chapters: Chapter[];
  selectedBookId?: string;
  selectedChapterId?: string;
  onSelectBook: (id: string) => void;
  onSelectChapter: (id: string, bookId: string) => void;
  onAdd?: () => void;
}

export default function BooksList({
  books,
  chapters,
  selectedBookId,
  selectedChapterId,
  onSelectBook,
  onSelectChapter,
  onAdd,
}: BooksListProps) {

  const getChaptersForBook = (bookId: string) =>
    chapters.filter((c) => c.bookId === bookId).sort((a, b) => a.order - b.order);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookText className="h-6 w-6 text-slate-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Books
            </h1>
            <p className="text-sm text-slate-500">
              {books.length} books, {chapters.length} chapters
            </p>
          </div>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Book
        </Button>
      </div>

      {/* Book list */}
      {books.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <BookText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No books yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Add books to organize your reading notes
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={onAdd}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Book
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {books.map((book) => {
            const bookChapters = getChaptersForBook(book._id);
            const isExpanded = selectedBookId === book._id;

            return (
              <div
                key={book._id}
                className={cn(
                  "bg-white dark:bg-slate-800 rounded-lg border overflow-hidden",
                  isExpanded
                    ? "border-blue-500"
                    : "border-slate-200 dark:border-slate-700"
                )}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  onClick={() => onSelectBook(book._id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-slate-100">
                        {book.title}
                      </h3>
                      {book.author && (
                        <p className="text-sm text-slate-500 mt-0.5">
                          by {book.author}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {bookChapters.length} chapters
                      </p>
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-5 w-5 text-slate-400 transition-transform",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </div>
                </div>

                {isExpanded && bookChapters.length > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-700">
                    {bookChapters.map((chapter) => (
                      <div
                        key={chapter._id}
                        onClick={() => onSelectChapter(chapter._id, book._id)}
                        className={cn(
                          "px-4 py-3 pl-8 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b last:border-b-0 border-slate-100 dark:border-slate-700",
                          selectedChapterId === chapter._id &&
                            "bg-blue-50 dark:bg-blue-900/20"
                        )}
                      >
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {chapter.order}. {chapter.title}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
