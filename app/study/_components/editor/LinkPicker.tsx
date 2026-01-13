"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Languages,
  ScrollText,
  BookOpen,
  Hash,
  Link2,
  Tag,
  GraduationCap,
  BookText,
  StickyNote,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ReferenceType =
  | "word"
  | "verse"
  | "hadith"
  | "root"
  | "lesson"
  | "chapter"
  | "tag"
  | "course"
  | "book"
  | "note";

export interface SelectedReference {
  type: ReferenceType;
  id: string;
  displayText: string;
}

interface LinkPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (ref: SelectedReference) => void;
  currentNoteId?: string; // To prevent self-referencing
}

export default function LinkPicker({
  open,
  onClose,
  onSelect,
  currentNoteId,
}: LinkPickerProps) {
  const [activeTab, setActiveTab] = useState<ReferenceType>("word");
  const [search, setSearch] = useState("");

  // Fetch all entity types
  const words = useQuery(api.study.words.list, {});
  const verses = useQuery(api.study.verses.list, {});
  const hadiths = useQuery(api.study.hadiths.list, {});
  const roots = useQuery(api.study.roots.list);
  const tags = useQuery(api.study.tags.list, {});
  const courses = useQuery(api.study.courses.listCourses, {});
  const books = useQuery(api.study.books.listBooks, {});
  const notes = useQuery(api.study.notes.listStandalone, {});
  const lessons = useQuery(api.study.courses.listAllLessons, {});
  const chapters = useQuery(api.study.books.listAllChapters, {});

  // Reset search when tab changes
  useEffect(() => {
    setSearch("");
  }, [activeTab]);

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase().trim();

    switch (activeTab) {
      case "word":
        return (words ?? [])
          .filter(
            (w) =>
              w.text.includes(search) ||
              w.transliteration?.toLowerCase().includes(query) ||
              w.meanings.some((m) => m.definition.toLowerCase().includes(query))
          )
          .slice(0, 20);
      case "verse":
        return (verses ?? [])
          .filter(
            (v) =>
              v.arabicText.includes(search) ||
              `${v.surahNumber}:${v.ayahStart}`.includes(query)
          )
          .slice(0, 20);
      case "hadith":
        return (hadiths ?? [])
          .filter(
            (h) =>
              h.arabicText.includes(search) ||
              h.collection.toLowerCase().includes(query) ||
              h.hadithNumber.includes(query)
          )
          .slice(0, 20);
      case "root":
        return (roots ?? [])
          .filter(
            (r) =>
              r.letters.includes(search) ||
              r.latinized.toLowerCase().includes(query) ||
              r.coreMeaning.toLowerCase().includes(query)
          )
          .slice(0, 20);
      case "tag":
        return (tags ?? [])
          .filter(
            (t) =>
              t.name.toLowerCase().includes(query) ||
              t.description?.toLowerCase().includes(query)
          )
          .slice(0, 20);
      case "course":
        return (courses ?? [])
          .filter(
            (c) =>
              c.title.toLowerCase().includes(query) ||
              c.description?.toLowerCase().includes(query)
          )
          .slice(0, 20);
      case "book":
        return (books ?? [])
          .filter(
            (b) =>
              b.title.toLowerCase().includes(query) ||
              b.author?.toLowerCase().includes(query)
          )
          .slice(0, 20);
      case "note":
        // Filter out current note to prevent self-referencing
        return (notes ?? [])
          .filter(
            (n) =>
              n._id !== currentNoteId &&
              (n.title?.toLowerCase().includes(query) ||
                n.content.toLowerCase().includes(query))
          )
          .slice(0, 20);
      case "lesson":
        return (lessons ?? [])
          .filter((l) => l.title.toLowerCase().includes(query))
          .slice(0, 20);
      case "chapter":
        return (chapters ?? [])
          .filter((ch) => ch.title.toLowerCase().includes(query))
          .slice(0, 20);
      default:
        return [];
    }
  }, [
    activeTab,
    search,
    words,
    verses,
    hadiths,
    roots,
    tags,
    courses,
    books,
    notes,
    lessons,
    chapters,
    currentNoteId,
  ]);

  const handleSelect = (item: unknown) => {
    let displayText = "";
    let id = "";

    switch (activeTab) {
      case "word": {
        const word = item as { _id: string; text: string };
        displayText = word.text;
        id = word._id;
        break;
      }
      case "verse": {
        const verse = item as {
          _id: string;
          surahNumber: number;
          ayahStart: number;
          ayahEnd?: number;
        };
        displayText = verse.ayahEnd
          ? `[${verse.surahNumber}:${verse.ayahStart}-${verse.ayahEnd}]`
          : `[${verse.surahNumber}:${verse.ayahStart}]`;
        id = verse._id;
        break;
      }
      case "hadith": {
        const hadith = item as {
          _id: string;
          collection: string;
          hadithNumber: string;
        };
        displayText = `[${hadith.collection} #${hadith.hadithNumber}]`;
        id = hadith._id;
        break;
      }
      case "root": {
        const root = item as { _id: string; letters: string };
        displayText = `[${root.letters}]`;
        id = root._id;
        break;
      }
      case "tag": {
        const tag = item as { _id: string; name: string };
        displayText = `#${tag.name}`;
        id = tag._id;
        break;
      }
      case "course": {
        const course = item as { _id: string; title: string };
        displayText = `[Course: ${course.title}]`;
        id = course._id;
        break;
      }
      case "book": {
        const book = item as { _id: string; title: string };
        displayText = `[Book: ${book.title}]`;
        id = book._id;
        break;
      }
      case "note": {
        const note = item as { _id: string; title?: string };
        displayText = `[[${note.title ?? "Untitled Note"}]]`;
        id = note._id;
        break;
      }
      case "lesson": {
        const lesson = item as { _id: string; title: string };
        displayText = `[Lesson: ${lesson.title}]`;
        id = lesson._id;
        break;
      }
      case "chapter": {
        const chapter = item as { _id: string; title: string };
        displayText = `[Chapter: ${chapter.title}]`;
        id = chapter._id;
        break;
      }
    }

    onSelect({ type: activeTab, id, displayText });
    onClose();
  };

  const tabConfig: Array<{
    value: ReferenceType;
    label: string;
    icon: React.ReactNode;
  }> = [
    { value: "word", label: "Word", icon: <Languages className="h-4 w-4" /> },
    { value: "verse", label: "Verse", icon: <BookOpen className="h-4 w-4" /> },
    {
      value: "hadith",
      label: "Hadith",
      icon: <ScrollText className="h-4 w-4" />,
    },
    { value: "root", label: "Root", icon: <Hash className="h-4 w-4" /> },
    { value: "tag", label: "Tag", icon: <Tag className="h-4 w-4" /> },
    {
      value: "course",
      label: "Course",
      icon: <GraduationCap className="h-4 w-4" />,
    },
    { value: "book", label: "Book", icon: <BookText className="h-4 w-4" /> },
    { value: "note", label: "Note", icon: <StickyNote className="h-4 w-4" /> },
    { value: "lesson", label: "Lesson", icon: <FileText className="h-4 w-4" /> },
    { value: "chapter", label: "Chapter", icon: <FileText className="h-4 w-4" /> },
  ];

  const isLoading =
    words === undefined ||
    verses === undefined ||
    hadiths === undefined ||
    roots === undefined ||
    tags === undefined ||
    courses === undefined ||
    books === undefined ||
    notes === undefined ||
    lessons === undefined ||
    chapters === undefined;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Insert Reference
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type Selection - custom buttons instead of Tabs to avoid navigation issues */}
          <div className="grid grid-cols-5 gap-1">
            {tabConfig.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveTab(tab.value);
                }}
                className={cn(
                  "flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-md transition-colors",
                  activeTab === tab.value
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <Input
            placeholder={`Search ${activeTab}s...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto border rounded-lg">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  <p>No results found</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredItems.map((item, idx) => (
                  <button
                    key={idx}
                    className={cn(
                      "w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50",
                      "focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/50"
                    )}
                    onClick={() => handleSelect(item)}
                  >
                    {activeTab === "word" && (
                      <WordItem
                        word={
                          item as {
                            text: string;
                            transliteration?: string;
                            meanings: Array<{ definition: string }>;
                          }
                        }
                      />
                    )}
                    {activeTab === "verse" && (
                      <VerseItem
                        verse={
                          item as {
                            surahNumber: number;
                            ayahStart: number;
                            ayahEnd?: number;
                            arabicText: string;
                          }
                        }
                      />
                    )}
                    {activeTab === "hadith" && (
                      <HadithItem
                        hadith={
                          item as {
                            collection: string;
                            hadithNumber: string;
                            arabicText: string;
                          }
                        }
                      />
                    )}
                    {activeTab === "root" && (
                      <RootItem
                        root={
                          item as {
                            letters: string;
                            latinized: string;
                            coreMeaning: string;
                          }
                        }
                      />
                    )}
                    {activeTab === "tag" && (
                      <TagItem
                        tag={
                          item as {
                            name: string;
                            description?: string;
                            color?: string;
                          }
                        }
                      />
                    )}
                    {activeTab === "course" && (
                      <CourseItem
                        course={
                          item as { title: string; description?: string }
                        }
                      />
                    )}
                    {activeTab === "book" && (
                      <BookItem
                        book={item as { title: string; author?: string }}
                      />
                    )}
                    {activeTab === "note" && (
                      <NoteItem
                        note={item as { title?: string; content: string }}
                      />
                    )}
                    {activeTab === "lesson" && (
                      <LessonItem
                        lesson={item as { title: string; courseTitle?: string }}
                      />
                    )}
                    {activeTab === "chapter" && (
                      <ChapterItem
                        chapter={item as { title: string; bookTitle?: string }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 text-center">
            Press Enter to select, Escape to cancel
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WordItem({
  word,
}: {
  word: {
    text: string;
    transliteration?: string;
    meanings: Array<{ definition: string }>;
  };
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="font-arabic text-lg">{word.text}</span>
        {word.transliteration && (
          <span className="text-sm text-slate-400">
            ({word.transliteration})
          </span>
        )}
      </div>
      {word.meanings[0] && (
        <p className="text-sm text-slate-500 truncate">
          {word.meanings[0].definition}
        </p>
      )}
    </div>
  );
}

function VerseItem({
  verse,
}: {
  verse: {
    surahNumber: number;
    ayahStart: number;
    ayahEnd?: number;
    arabicText: string;
  };
}) {
  return (
    <div>
      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
        {verse.surahNumber}:{verse.ayahStart}
        {verse.ayahEnd && verse.ayahEnd !== verse.ayahStart && `-${verse.ayahEnd}`}
      </span>
      <p className="font-arabic text-sm truncate mt-1" dir="rtl">
        {verse.arabicText.slice(0, 100)}...
      </p>
    </div>
  );
}

function HadithItem({
  hadith,
}: {
  hadith: { collection: string; hadithNumber: string; arabicText: string };
}) {
  return (
    <div>
      <span className="text-sm font-medium text-green-600 dark:text-green-400">
        {hadith.collection} #{hadith.hadithNumber}
      </span>
      <p className="font-arabic text-sm truncate mt-1" dir="rtl">
        {hadith.arabicText.slice(0, 100)}...
      </p>
    </div>
  );
}

function RootItem({
  root,
}: {
  root: { letters: string; latinized: string; coreMeaning: string };
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-arabic text-xl">{root.letters}</span>
      <div>
        <span className="font-mono text-sm text-slate-400">
          {root.latinized}
        </span>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {root.coreMeaning}
        </p>
      </div>
    </div>
  );
}

function TagItem({
  tag,
}: {
  tag: { name: string; description?: string; color?: string };
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: tag.color ?? "#6b7280" }}
      />
      <div>
        <span className="font-medium">#{tag.name}</span>
        {tag.description && (
          <p className="text-sm text-slate-500 truncate">{tag.description}</p>
        )}
      </div>
    </div>
  );
}

function CourseItem({
  course,
}: {
  course: { title: string; description?: string };
}) {
  return (
    <div>
      <span className="font-medium text-indigo-600 dark:text-indigo-400">
        {course.title}
      </span>
      {course.description && (
        <p className="text-sm text-slate-500 truncate">{course.description}</p>
      )}
    </div>
  );
}

function BookItem({ book }: { book: { title: string; author?: string } }) {
  return (
    <div>
      <span className="font-medium text-rose-600 dark:text-rose-400">
        {book.title}
      </span>
      {book.author && (
        <p className="text-sm text-slate-500">by {book.author}</p>
      )}
    </div>
  );
}

function NoteItem({ note }: { note: { title?: string; content: string } }) {
  return (
    <div>
      <span className="font-medium text-yellow-600 dark:text-yellow-400">
        {note.title ?? "Untitled Note"}
      </span>
      <p className="text-sm text-slate-500 truncate">
        {note.content.slice(0, 60)}
        {note.content.length > 60 && "..."}
      </p>
    </div>
  );
}

function LessonItem({
  lesson,
}: {
  lesson: { title: string; courseTitle?: string };
}) {
  return (
    <div>
      <span className="font-medium text-purple-600 dark:text-purple-400">
        {lesson.title}
      </span>
      {lesson.courseTitle && (
        <p className="text-sm text-slate-500">in {lesson.courseTitle}</p>
      )}
    </div>
  );
}

function ChapterItem({
  chapter,
}: {
  chapter: { title: string; bookTitle?: string };
}) {
  return (
    <div>
      <span className="font-medium text-teal-600 dark:text-teal-400">
        {chapter.title}
      </span>
      {chapter.bookTitle && (
        <p className="text-sm text-slate-500">in {chapter.bookTitle}</p>
      )}
    </div>
  );
}
