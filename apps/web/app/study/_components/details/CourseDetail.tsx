"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import {
  GraduationCap,
  Edit2,
  Trash2,
  Loader2,
  Plus,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityType, ViewType } from "../StudyPageClient";
import RichTextViewer from "@/components/rich-text/RichTextViewer";
import type { JSONContent, EntityReferenceAttributes } from "@/components/rich-text/types";

interface CourseDetailProps {
  courseId: string;
  onNavigate: (
    view: ViewType,
    type?: EntityType,
    id?: string,
    parent?: string
  ) => void;
  onEdit: () => void;
  onAddLesson: () => void;
}

export default function CourseDetail({
  courseId,
  onNavigate,
  onEdit,
  onAddLesson,
}: CourseDetailProps) {
  const course = useQuery(api.study.courses.getCourse, {
    id: courseId as Id<"courses">,
  });
  const lessons = useQuery(api.study.courses.listLessons, {
    courseId: courseId as Id<"courses">,
  });
  const deleteCourse = useMutation(api.study.courses.removeCourse);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (course === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (course === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Course not found</p>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteCourse({ id: courseId as Id<"courses"> });
    onNavigate("courses");
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

  const hasRichContent = course.descriptionJson || course.description;
  const source = course.source?.trim();
  const sourceIsUrl = !!source && /^https?:\/\//i.test(source);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <GraduationCap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {course.title}
            </h1>
            {lessons && (
              <p className="text-slate-500">{lessons.length} lessons</p>
            )}
            {source && (
              <p className="text-sm text-slate-500">
                Source:{" "}
                {sourceIsUrl ? (
                  <a
                    href={source}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    {source}
                  </a>
                ) : (
                  source
                )}
              </p>
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
          {course.descriptionJson ? (
            <RichTextViewer
              content={course.descriptionJson as JSONContent}
              onEntityClick={handleEntityClick}
            />
          ) : (
            <p className="text-slate-600 dark:text-slate-400">
              {course.description}
            </p>
          )}
        </div>
      )}

      {/* Lessons */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Lessons
          </h2>
          <Button variant="outline" size="sm" onClick={onAddLesson}>
            <Plus className="h-4 w-4 mr-1" />
            Add Lesson
          </Button>
        </div>

        {lessons === undefined ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
            <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No lessons in this course yet</p>
            <Button variant="outline" className="mt-4" onClick={onAddLesson}>
              <Plus className="h-4 w-4 mr-1" />
              Add First Lesson
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {lessons.map((lesson, index) => (
              <div
                key={lesson._id}
                onClick={() =>
                  onNavigate("courses", "lesson", lesson._id, courseId)
                }
                className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-slate-100">
                      {lesson.title}
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
