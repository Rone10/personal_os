"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import {
  BookOpen,
  Edit2,
  Trash2,
  Loader2,
  ChevronLeft,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityType, ViewType } from "../StudyPageClient";

interface LessonDetailProps {
  lessonId: string;
  courseId: string;
  onNavigate: (
    view: ViewType,
    type?: EntityType,
    id?: string,
    parent?: string
  ) => void;
  onEdit: () => void;
}

export default function LessonDetail({
  lessonId,
  courseId,
  onNavigate,
  onEdit,
}: LessonDetailProps) {
  const lesson = useQuery(api.study.courses.getLesson, {
    id: lessonId as Id<"lessons">,
  });
  const course = useQuery(api.study.courses.getCourse, {
    id: courseId as Id<"courses">,
  });
  const deleteLesson = useMutation(api.study.courses.removeLesson);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (lesson === undefined || course === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (lesson === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Lesson not found</p>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteLesson({ id: lessonId as Id<"lessons"> });
    onNavigate("courses", "course", courseId);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Back to Course */}
      <div
        className="flex items-center gap-2 text-sm text-slate-500 mb-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300"
        onClick={() => onNavigate("courses", "course", courseId)}
      >
        <ChevronLeft className="h-4 w-4" />
        <GraduationCap className="h-4 w-4" />
        <span>{course?.title ?? "Course"}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {lesson.title}
            </h1>
            <p className="text-slate-500">Lesson {lesson.order + 1}</p>
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
      {lesson.content ? (
        <div className="prose dark:prose-invert max-w-none">
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
              {lesson.content}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No content yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Edit this lesson to add content
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
