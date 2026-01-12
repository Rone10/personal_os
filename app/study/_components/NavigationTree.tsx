"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  GraduationCap,
  Languages,
  BookText,
  ScrollText,
  StickyNote,
  Hash,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ViewType, EntityType } from "./StudyPageClient";

interface NavigationTreeProps {
  data: {
    roots: Array<{ _id: string; letters: string; coreMeaning: string }>;
    words: Array<{ _id: string; text: string }>;
    verses: Array<{
      _id: string;
      surahNumber: number;
      ayahStart: number;
      ayahEnd?: number;
    }>;
    hadiths: Array<{ _id: string; collection: string; hadithNumber: string }>;
    courses: Array<{ _id: string; title: string }>;
    lessons: Array<{ _id: string; courseId: string; title: string }>;
    books: Array<{ _id: string; title: string }>;
    chapters: Array<{ _id: string; bookId: string; title: string }>;
    notes: Array<{ _id: string; title?: string; content: string }>;
    tags: Array<{ _id: string; name: string }>;
  };
  currentView: ViewType;
  currentEntityType?: EntityType;
  currentEntityId?: string;
  onNavigate: (
    view: ViewType,
    type?: EntityType,
    id?: string,
    parent?: string
  ) => void;
}

interface TreeSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  onAdd?: () => void;
}

function TreeSection({
  title,
  icon,
  defaultOpen = false,
  children,
  onAdd,
}: TreeSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-1">
      <div
        className="flex items-center gap-1 px-2 py-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded group"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        )}
        <span className="text-slate-500">{icon}</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">
          {title}
        </span>
        {onAdd && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
      {open && <div className="ml-3 pl-2 border-l border-slate-200 dark:border-slate-700">{children}</div>}
    </div>
  );
}

interface TreeItemProps {
  label: string;
  sublabel?: string;
  isActive?: boolean;
  onClick: () => void;
  isArabic?: boolean;
}

function TreeItem({
  label,
  sublabel,
  isActive,
  onClick,
  isArabic,
}: TreeItemProps) {
  return (
    <div
      className={cn(
        "px-2 py-1 text-sm cursor-pointer rounded truncate",
        isActive
          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      )}
      onClick={onClick}
    >
      <span className={isArabic ? "font-arabic" : ""}>{label}</span>
      {sublabel && (
        <span className="text-xs text-slate-400 ml-1">({sublabel})</span>
      )}
    </div>
  );
}

export default function NavigationTree({
  data,
  currentView,
  currentEntityType,
  currentEntityId,
  onNavigate,
}: NavigationTreeProps) {
  // Group verses by surah
  const versesBySurah = data.verses.reduce(
    (acc, v) => {
      const key = v.surahNumber;
      if (!acc[key]) acc[key] = [];
      acc[key].push(v);
      return acc;
    },
    {} as Record<number, typeof data.verses>
  );

  // Group hadiths by collection
  const hadithsByCollection = data.hadiths.reduce(
    (acc, h) => {
      if (!acc[h.collection]) acc[h.collection] = [];
      acc[h.collection].push(h);
      return acc;
    },
    {} as Record<string, typeof data.hadiths>
  );

  return (
    <div className="p-2">
      {/* Vocabulary */}
      <TreeSection
        title={`Roots (${data.roots.length})`}
        icon={<Hash className="h-4 w-4" />}
        defaultOpen={currentView === "roots"}
      >
        {data.roots.slice(0, 20).map((root) => (
          <TreeItem
            key={root._id}
            label={root.letters}
            sublabel={root.coreMeaning}
            isActive={currentEntityType === "root" && currentEntityId === root._id}
            onClick={() => onNavigate("roots", "root", root._id)}
            isArabic
          />
        ))}
        {data.roots.length > 20 && (
          <div
            className="px-2 py-1 text-xs text-slate-400 cursor-pointer hover:text-slate-600"
            onClick={() => onNavigate("roots")}
          >
            View all {data.roots.length} roots...
          </div>
        )}
      </TreeSection>

      <TreeSection
        title={`Words (${data.words.length})`}
        icon={<Languages className="h-4 w-4" />}
        defaultOpen={currentView === "words"}
      >
        {data.words.slice(0, 20).map((word) => (
          <TreeItem
            key={word._id}
            label={word.text}
            isActive={currentEntityType === "word" && currentEntityId === word._id}
            onClick={() => onNavigate("words", "word", word._id)}
            isArabic
          />
        ))}
        {data.words.length > 20 && (
          <div
            className="px-2 py-1 text-xs text-slate-400 cursor-pointer hover:text-slate-600"
            onClick={() => onNavigate("words")}
          >
            View all {data.words.length} words...
          </div>
        )}
      </TreeSection>

      {/* Quran */}
      <TreeSection
        title={`Quran (${data.verses.length})`}
        icon={<BookOpen className="h-4 w-4" />}
        defaultOpen={currentView === "verses"}
      >
        {Object.entries(versesBySurah)
          .slice(0, 10)
          .map(([surah, verses]) => (
            <TreeItem
              key={surah}
              label={`Surah ${surah}`}
              sublabel={`${verses.length} verses`}
              isActive={
                currentView === "verses" &&
                verses.some((v) => v._id === currentEntityId)
              }
              onClick={() => onNavigate("verses", undefined, undefined, surah)}
            />
          ))}
        {Object.keys(versesBySurah).length > 10 && (
          <div
            className="px-2 py-1 text-xs text-slate-400 cursor-pointer hover:text-slate-600"
            onClick={() => onNavigate("verses")}
          >
            View all...
          </div>
        )}
      </TreeSection>

      {/* Hadith */}
      <TreeSection
        title={`Hadith (${data.hadiths.length})`}
        icon={<ScrollText className="h-4 w-4" />}
        defaultOpen={currentView === "hadiths"}
      >
        {Object.entries(hadithsByCollection).map(([collection, hadiths]) => (
          <TreeItem
            key={collection}
            label={collection}
            sublabel={`${hadiths.length}`}
            isActive={
              currentView === "hadiths" &&
              hadiths.some((h) => h._id === currentEntityId)
            }
            onClick={() =>
              onNavigate("hadiths", undefined, undefined, collection)
            }
          />
        ))}
      </TreeSection>

      {/* Courses */}
      <TreeSection
        title={`Courses (${data.courses.length})`}
        icon={<GraduationCap className="h-4 w-4" />}
        defaultOpen={currentView === "courses"}
      >
        {data.courses.map((course) => {
          const lessons = data.lessons.filter((l) => l.courseId === course._id);
          const isExpanded =
            (currentEntityType === "course" && currentEntityId === course._id) ||
            (currentEntityType === "lesson" && lessons.some((l) => l._id === currentEntityId));
          return (
            <div key={course._id}>
              <TreeItem
                label={course.title}
                sublabel={`${lessons.length} lessons`}
                isActive={
                  currentEntityType === "course" && currentEntityId === course._id
                }
                onClick={() => onNavigate("courses", "course", course._id)}
              />
              {isExpanded &&
                lessons.map((lesson) => (
                  <div key={lesson._id} className="ml-3">
                    <TreeItem
                      label={lesson.title}
                      isActive={currentEntityId === lesson._id}
                      onClick={() =>
                        onNavigate("courses", "lesson", lesson._id, course._id)
                      }
                    />
                  </div>
                ))}
            </div>
          );
        })}
      </TreeSection>

      {/* Books */}
      <TreeSection
        title={`Books (${data.books.length})`}
        icon={<BookText className="h-4 w-4" />}
        defaultOpen={currentView === "books"}
      >
        {data.books.map((book) => {
          const chapters = data.chapters.filter((c) => c.bookId === book._id);
          const isExpanded =
            (currentEntityType === "book" && currentEntityId === book._id) ||
            (currentEntityType === "chapter" && chapters.some((c) => c._id === currentEntityId));
          return (
            <div key={book._id}>
              <TreeItem
                label={book.title}
                sublabel={`${chapters.length} chapters`}
                isActive={
                  currentEntityType === "book" && currentEntityId === book._id
                }
                onClick={() => onNavigate("books", "book", book._id)}
              />
              {isExpanded &&
                chapters.map((chapter) => (
                  <div key={chapter._id} className="ml-3">
                    <TreeItem
                      label={chapter.title}
                      isActive={currentEntityId === chapter._id}
                      onClick={() =>
                        onNavigate("books", "chapter", chapter._id, book._id)
                      }
                    />
                  </div>
                ))}
            </div>
          );
        })}
      </TreeSection>

      {/* Notes */}
      <TreeSection
        title={`Notes (${data.notes.length})`}
        icon={<StickyNote className="h-4 w-4" />}
        defaultOpen={currentView === "notes"}
      >
        {data.notes.slice(0, 10).map((note) => (
          <TreeItem
            key={note._id}
            label={note.title ?? note.content.slice(0, 30) + "..."}
            isActive={currentEntityType === "note" && currentEntityId === note._id}
            onClick={() => onNavigate("notes", "note", note._id)}
          />
        ))}
        {data.notes.length > 10 && (
          <div
            className="px-2 py-1 text-xs text-slate-400 cursor-pointer hover:text-slate-600"
            onClick={() => onNavigate("notes")}
          >
            View all {data.notes.length} notes...
          </div>
        )}
      </TreeSection>
    </div>
  );
}
