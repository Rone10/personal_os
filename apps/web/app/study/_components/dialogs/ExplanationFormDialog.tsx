"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import RichTextEditor from "@/components/rich-text/RichTextEditor";
import type { JSONContent } from "@/components/rich-text/types";

type SourceType = "personal" | "external" | "lesson" | "chapter";
type SubjectType = "word" | "verse" | "hadith" | "root";

interface ExplanationFormDialogProps {
  open: boolean;
  onClose: () => void;
  subjectType: SubjectType;
  subjectId: string;
  editId?: string;
}

export default function ExplanationFormDialog({
  open,
  onClose,
  subjectType,
  subjectId,
  editId,
}: ExplanationFormDialogProps) {
  const existingExplanation = useQuery(
    api.study.explanations.getById,
    editId ? { id: editId as Id<"explanations"> } : "skip"
  );

  const createExplanation = useMutation(api.study.explanations.create);
  const updateExplanation = useMutation(api.study.explanations.update);

  // Form state
  const [sourceType, setSourceType] = useState<SourceType>("personal");
  const [sourceLabel, setSourceLabel] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [contentJson, setContentJson] = useState<JSONContent | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Queries for source pickers
  const courses = useQuery(api.study.courses.listCourses);
  const books = useQuery(api.study.books.listBooks);
  const lessons = useQuery(
    api.study.courses.listLessons,
    selectedCourseId ? { courseId: selectedCourseId as Id<"courses"> } : "skip"
  );
  const chapters = useQuery(
    api.study.books.listChapters,
    selectedBookId ? { bookId: selectedBookId as Id<"books"> } : "skip"
  );

  // Load existing explanation data
  useEffect(() => {
    if (existingExplanation) {
      setSourceType(existingExplanation.sourceType);
      setSourceLabel(existingExplanation.sourceLabel ?? "");
      setContentJson(existingExplanation.contentJson);
      // Note: We don't restore source picker selections for simplicity
      // The sourceLabel preserves the attribution info
    } else if (!editId) {
      resetForm();
    }
  }, [existingExplanation, editId]);

  const resetForm = () => {
    setSourceType("personal");
    setSourceLabel("");
    setSelectedCourseId("");
    setSelectedBookId("");
    setSelectedLessonId("");
    setSelectedChapterId("");
    setContentJson(undefined);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleContentChange = useCallback((content: JSONContent) => {
    setContentJson(content);
  }, []);

  // Extract plain text from Tiptap JSON
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

  // Build source info based on selection
  const getSourceInfo = (): { sourceId?: string; sourceLabel?: string } => {
    if (sourceType === "lesson" && selectedLessonId) {
      const lesson = lessons?.find((l) => l._id === selectedLessonId);
      const course = courses?.find((c) => c._id === selectedCourseId);
      return {
        sourceId: selectedLessonId,
        sourceLabel: sourceLabel || `${course?.title ?? "Course"} - ${lesson?.title ?? "Lesson"}`,
      };
    }
    if (sourceType === "chapter" && selectedChapterId) {
      const chapter = chapters?.find((c) => c._id === selectedChapterId);
      const book = books?.find((b) => b._id === selectedBookId);
      return {
        sourceId: selectedChapterId,
        sourceLabel: sourceLabel || `${book?.title ?? "Book"} - ${chapter?.title ?? "Chapter"}`,
      };
    }
    return {
      sourceLabel: sourceLabel || undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const plainText = getPlainText(contentJson);
    if (!plainText.trim()) return;

    setIsSaving(true);
    try {
      const { sourceId, sourceLabel: computedSourceLabel } = getSourceInfo();

      if (editId) {
        await updateExplanation({
          id: editId as Id<"explanations">,
          content: plainText,
          contentJson,
          sourceType,
          sourceId,
          sourceLabel: computedSourceLabel,
        });
      } else {
        await createExplanation({
          content: plainText,
          contentJson,
          sourceType,
          sourceId,
          sourceLabel: computedSourceLabel,
          subjectType,
          subjectId,
        });
      }
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const getSubjectLabel = () => {
    switch (subjectType) {
      case "word":
        return "Word";
      case "verse":
        return "Verse";
      case "hadith":
        return "Hadith";
      case "root":
        return "Root";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editId ? "Edit Explanation" : `Add Explanation to ${getSubjectLabel()}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source Type */}
          <div>
            <Label htmlFor="sourceType">Source Type</Label>
            <Select
              value={sourceType}
              onValueChange={(v) => {
                setSourceType(v as SourceType);
                setSelectedCourseId("");
                setSelectedBookId("");
                setSelectedLessonId("");
                setSelectedChapterId("");
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal Note</SelectItem>
                <SelectItem value="external">External Source</SelectItem>
                <SelectItem value="lesson">From Lesson</SelectItem>
                <SelectItem value="chapter">From Book Chapter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lesson Picker */}
          {sourceType === "lesson" && (
            <div className="space-y-3">
              <div>
                <Label>Course</Label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map((course) => (
                      <SelectItem key={course._id} value={course._id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCourseId && (
                <div>
                  <Label>Lesson</Label>
                  <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a lesson" />
                    </SelectTrigger>
                    <SelectContent>
                      {lessons?.map((lesson) => (
                        <SelectItem key={lesson._id} value={lesson._id}>
                          {lesson.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Chapter Picker */}
          {sourceType === "chapter" && (
            <div className="space-y-3">
              <div>
                <Label>Book</Label>
                <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a book" />
                  </SelectTrigger>
                  <SelectContent>
                    {books?.map((book) => (
                      <SelectItem key={book._id} value={book._id}>
                        {book.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedBookId && (
                <div>
                  <Label>Chapter</Label>
                  <Select value={selectedChapterId} onValueChange={setSelectedChapterId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters?.map((chapter) => (
                        <SelectItem key={chapter._id} value={chapter._id}>
                          {chapter.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Source Label */}
          <div>
            <Label htmlFor="sourceLabel">
              {sourceType === "external"
                ? "Source Attribution"
                : "Custom Label (optional)"}
            </Label>
            <Input
              id="sourceLabel"
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              placeholder={
                sourceType === "external"
                  ? "e.g., Tafsir Ibn Kathir, Vol. 2"
                  : "Override auto-generated label"
              }
              className="mt-1"
            />
          </div>

          {/* Content */}
          <div>
            <Label>Explanation *</Label>
            <RichTextEditor
              value={contentJson}
              onChange={handleContentChange}
              placeholder="Write your explanation here..."
              enableEntityReferences={true}
              minHeight="200px"
              className="mt-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !getPlainText(contentJson).trim()}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
