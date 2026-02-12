"use client";

import { useState } from "react";
import { ViewType, EntityType } from "./StudyPageClient";

// List components
import WordsList from "./lists/WordsList";
import VersesList from "./lists/VersesList";
import HadithsList from "./lists/HadithsList";
import RootsList from "./lists/RootsList";
import CoursesList from "./lists/CoursesList";
import BooksList from "./lists/BooksList";
import NotesList from "./lists/NotesList";
import TagsList from "./lists/TagsList";
import CollectionsList from "./lists/CollectionsList";

// View components
import DashboardView from "./views/DashboardView";
import FlashcardsView from "./views/FlashcardsView";

// Detail components
import WordDetail from "./details/WordDetail";
import RootDetail from "./details/RootDetail";
import VerseDetail from "./details/VerseDetail";
import HadithDetail from "./details/HadithDetail";
import CourseDetail from "./details/CourseDetail";
import LessonDetail from "./details/LessonDetail";
import BookDetail from "./details/BookDetail";
import ChapterDetail from "./details/ChapterDetail";
import NoteDetail from "./details/NoteDetail";
import TagDetail from "./details/TagDetail";
import CollectionDetail from "./details/CollectionDetail";

// Form dialogs
import WordFormDialog from "./dialogs/WordFormDialog";
import RootFormDialog from "./dialogs/RootFormDialog";
import VerseFormDialog from "./dialogs/VerseFormDialog";
import HadithFormDialog from "./dialogs/HadithFormDialog";
import CourseFormDialog from "./dialogs/CourseFormDialog";
import LessonFormDialog from "./dialogs/LessonFormDialog";
import TopicFormDialog from "./dialogs/TopicFormDialog";
import BookFormDialog from "./dialogs/BookFormDialog";
import ChapterFormDialog from "./dialogs/ChapterFormDialog";
import NoteFormDialog from "./dialogs/NoteFormDialog";
import TagFormDialog from "./dialogs/TagFormDialog";
import CollectionFormDialog from "./dialogs/CollectionFormDialog";

interface MainContentProps {
  view: ViewType;
  entityType?: EntityType;
  entityId?: string;
  parentId?: string;
  onNavigate: (view: ViewType, type?: EntityType, id?: string, parent?: string) => void;
  searchQuery: string;
  searchData: SearchData;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SearchData = Record<string, any[]>;

type DialogType =
  | "word" | "root" | "verse" | "hadith"
  | "course" | "topic" | "lesson" | "book" | "chapter" | "note" | "tag" | "collection"
  | null;

export default function MainContent(props: MainContentProps) {
  const {
    view,
    entityType,
    entityId,
    parentId,
    onNavigate,
    // searchQuery - TODO: Use for search filtering
    searchData,
  } = props;
  const [openDialog, setOpenDialog] = useState<DialogType>(null);
  const [editId, setEditId] = useState<string | undefined>();
  const [topicCourseId, setTopicCourseId] = useState<string | undefined>();
  const [lessonContext, setLessonContext] = useState<{
    courseId?: string;
    topicId?: string;
  }>({});

  const openCreateDialog = (
    type: DialogType,
    options?: { courseId?: string; topicId?: string }
  ) => {
    setEditId(undefined);
    setOpenDialog(type);
    if (type === "topic") {
      setTopicCourseId(options?.courseId);
    }
    if (type === "lesson") {
      setLessonContext({
        courseId: options?.courseId,
        topicId: options?.topicId,
      });
    }
  };

  const openEditDialog = (type: DialogType, id: string) => {
    setEditId(id);
    setOpenDialog(type);
    setTopicCourseId(undefined);
    setLessonContext({});
  };

  const closeDialog = () => {
    setOpenDialog(null);
    setEditId(undefined);
    setTopicCourseId(undefined);
    setLessonContext({});
  };

  // If we have an entityId, show the detail view
  if (entityId && entityType) {
    return (
      <>
        {renderDetailView()}
        {renderDialogs()}
      </>
    );
  }

  // Otherwise show the list/main view
  return (
    <>
      {renderListView()}
      {renderDialogs()}
    </>
  );

  function renderDetailView() {
    switch (entityType) {
      case "word":
        return (
          <WordDetail
            wordId={entityId!}
            onNavigate={onNavigate}
            onEdit={() => openEditDialog("word", entityId!)}
          />
        );
      case "root":
        return (
          <RootDetail
            rootId={entityId!}
            onNavigate={onNavigate}
            onEdit={() => openEditDialog("root", entityId!)}
          />
        );
      case "verse":
        return (
          <VerseDetail
            verseId={entityId!}
            onNavigate={onNavigate}
            onEdit={() => openEditDialog("verse", entityId!)}
          />
        );
      case "hadith":
        return (
          <HadithDetail
            hadithId={entityId!}
            onNavigate={onNavigate}
            onEdit={() => openEditDialog("hadith", entityId!)}
          />
        );
      case "course":
        return (
          <CourseDetail
            courseId={entityId!}
            onNavigate={onNavigate}
            onEdit={() => openEditDialog("course", entityId!)}
            onAddLesson={(topicId) =>
              openCreateDialog("lesson", { courseId: entityId!, topicId })
            }
            onAddTopic={() => openCreateDialog("topic", { courseId: entityId! })}
            onEditTopic={(topicId) => openEditDialog("topic", topicId)}
          />
        );
      case "lesson":
        return (
          <LessonDetail
            lessonId={entityId!}
            courseId={parentId!}
            onNavigate={onNavigate}
            onEdit={() => openEditDialog("lesson", entityId!)}
          />
        );
      case "book":
        return (
          <BookDetail
            bookId={entityId!}
            onNavigate={onNavigate}
            onEdit={() => openEditDialog("book", entityId!)}
            onAddChapter={() => openCreateDialog("chapter")}
          />
        );
      case "chapter":
        return (
          <ChapterDetail
            chapterId={entityId!}
            bookId={parentId!}
            onNavigate={onNavigate}
            onEdit={() => openEditDialog("chapter", entityId!)}
          />
        );
      case "note":
        return (
          <NoteDetail
            noteId={entityId!}
            onNavigate={onNavigate}
          />
        );
      case "tag":
        return (
          <TagDetail
            tagId={entityId!}
            onNavigate={onNavigate}
            onEdit={() => openEditDialog("tag", entityId!)}
          />
        );
      case "collection":
        return (
          <CollectionDetail
            collectionId={entityId!}
            onNavigate={onNavigate}
            onEdit={() => openEditDialog("collection", entityId!)}
          />
        );
      default:
        return (
          <div className="p-8 text-center text-slate-500">
            Unknown entity type: {entityType}
          </div>
        );
    }
  }

  function renderListView() {
    switch (view) {
      case "dashboard":
        return (
          <DashboardView
            searchData={searchData}
            onNavigate={onNavigate}
          />
        );

      case "flashcards":
        return <FlashcardsView />;

      case "roots":
        return (
          <RootsList
            roots={searchData.roots}
            selectedId={undefined}
            onSelect={(id) => onNavigate("roots", "root", id)}
            onAdd={() => openCreateDialog("root")}
          />
        );

      case "words":
        return (
          <WordsList
            words={searchData.words}
            selectedId={undefined}
            onSelect={(id) => onNavigate("words", "word", id)}
            onAdd={() => openCreateDialog("word")}
          />
        );

      case "verses":
        return (
          <VersesList
            verses={searchData.verses}
            selectedId={undefined}
            filterSurah={parentId ? parseInt(parentId) : undefined}
            onSelect={(id) => onNavigate("verses", "verse", id)}
            onAdd={() => openCreateDialog("verse")}
          />
        );

      case "hadiths":
        return (
          <HadithsList
            hadiths={searchData.hadiths}
            selectedId={undefined}
            filterCollection={parentId}
            onSelect={(id) => onNavigate("hadiths", "hadith", id)}
            onAdd={() => openCreateDialog("hadith")}
          />
        );

      case "courses":
        return (
          <CoursesList
            courses={searchData.courses}
            lessons={searchData.lessons}
            topics={searchData.topics ?? []}
            selectedCourseId={undefined}
            selectedLessonId={undefined}
            onSelectCourse={(id) => onNavigate("courses", "course", id)}
            onSelectLesson={(id, courseId) => onNavigate("courses", "lesson", id, courseId)}
            onAdd={() => openCreateDialog("course")}
          />
        );

      case "books":
        return (
          <BooksList
            books={searchData.books}
            chapters={searchData.chapters}
            selectedBookId={undefined}
            selectedChapterId={undefined}
            onSelectBook={(id) => onNavigate("books", "book", id)}
            onSelectChapter={(id, bookId) => onNavigate("books", "chapter", id, bookId)}
            onAdd={() => openCreateDialog("book")}
          />
        );

      case "notes":
        return (
          <NotesList
            notes={searchData.notes}
            selectedId={undefined}
            onSelect={(id) => onNavigate("notes", "note", id)}
            onAdd={() => openCreateDialog("note")}
          />
        );

      case "tags":
        return (
          <TagsList
            tags={searchData.tags}
            selectedId={undefined}
            onSelect={(id) => onNavigate("tags", "tag", id)}
            onAdd={() => openCreateDialog("tag")}
          />
        );

      case "collections":
        return (
          <CollectionsList
            collections={searchData.collections ?? []}
            selectedId={undefined}
            onSelect={(id) => onNavigate("collections", "collection", id)}
            onAdd={() => openCreateDialog("collection")}
          />
        );

      default:
        return (
          <div className="p-8 text-center text-slate-500">
            Unknown view: {view}
          </div>
        );
    }
  }

  function renderDialogs() {
    // Only pass editId to the dialog that's actually open to avoid
    // queries firing with wrong table IDs
    return (
      <>
        <WordFormDialog
          open={openDialog === "word"}
          onClose={closeDialog}
          editId={openDialog === "word" ? editId : undefined}
        />
        <RootFormDialog
          open={openDialog === "root"}
          onClose={closeDialog}
          editId={openDialog === "root" ? editId : undefined}
        />
        <VerseFormDialog
          open={openDialog === "verse"}
          onClose={closeDialog}
          editId={openDialog === "verse" ? editId : undefined}
        />
        <HadithFormDialog
          open={openDialog === "hadith"}
          onClose={closeDialog}
          editId={openDialog === "hadith" ? editId : undefined}
        />
        <CourseFormDialog
          open={openDialog === "course"}
          onClose={closeDialog}
          editId={openDialog === "course" ? editId : undefined}
        />
        <TopicFormDialog
          open={openDialog === "topic"}
          onClose={closeDialog}
          courseId={topicCourseId ?? entityId ?? ""}
          editId={openDialog === "topic" ? editId : undefined}
        />
        <LessonFormDialog
          open={openDialog === "lesson"}
          onClose={closeDialog}
          courseId={lessonContext.courseId ?? ""}
          defaultTopicId={lessonContext.topicId}
          editId={openDialog === "lesson" ? editId : undefined}
        />
        <BookFormDialog
          open={openDialog === "book"}
          onClose={closeDialog}
          editId={openDialog === "book" ? editId : undefined}
        />
        <ChapterFormDialog
          open={openDialog === "chapter"}
          onClose={closeDialog}
          bookId={entityId ?? ""}
          editId={openDialog === "chapter" ? editId : undefined}
        />
        <NoteFormDialog
          open={openDialog === "note"}
          onClose={closeDialog}
          onCreated={(noteId) => onNavigate("notes", "note", noteId)}
        />
        <TagFormDialog
          open={openDialog === "tag"}
          onClose={closeDialog}
          editId={openDialog === "tag" ? editId : undefined}
        />
        <CollectionFormDialog
          open={openDialog === "collection"}
          onClose={closeDialog}
          editId={openDialog === "collection" ? editId : undefined}
        />
      </>
    );
  }
}
