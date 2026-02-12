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
  onAddLesson: (topicId?: string) => void;
  onAddTopic: () => void;
  onEditTopic: (topicId: string) => void;
}

export default function CourseDetail({
  courseId,
  onNavigate,
  onEdit,
  onAddLesson,
  onAddTopic,
  onEditTopic,
}: CourseDetailProps) {
  const course = useQuery(api.study.courses.getCourse, {
    id: courseId as Id<"courses">,
  });
  const lessons = useQuery(api.study.courses.listLessons, {
    courseId: courseId as Id<"courses">,
  });
  const topics = useQuery(api.study.courses.listTopics, {
    courseId: courseId as Id<"courses">,
  });
  const deleteCourse = useMutation(api.study.courses.removeCourse);
  const deleteTopic = useMutation(api.study.courses.removeTopic);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmTopicDeleteId, setConfirmTopicDeleteId] = useState<string | null>(null);

  if (course === undefined || lessons === undefined || topics === undefined) {
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
  const sortedTopics = [...topics].sort((a, b) => a.order - b.order);
  const ungroupedLessons = lessons.filter((lesson) => !lesson.topicId);

  const handleDeleteTopic = async (topicId: string) => {
    await deleteTopic({ id: topicId as Id<"topics"> });
    setConfirmTopicDeleteId(null);
  };

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

      {/* Topics & Lessons */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Topics & Lessons
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onAddTopic}>
              <Plus className="h-4 w-4 mr-1" />
              Add Topic
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAddLesson()}>
              <Plus className="h-4 w-4 mr-1" />
              Add Lesson
            </Button>
          </div>
        </div>

        {lessons.length === 0 && topics.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
            <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No topics or lessons yet</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" onClick={onAddTopic}>
                <Plus className="h-4 w-4 mr-1" />
                Add Topic
              </Button>
              <Button variant="outline" onClick={() => onAddLesson()}>
                <Plus className="h-4 w-4 mr-1" />
                Add Lesson
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* General (ungrouped) */}
            {ungroupedLessons.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      General
                    </h3>
                    <p className="text-xs text-slate-500">
                      {ungroupedLessons.length} lessons
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onAddLesson()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Lesson
                  </Button>
                </div>
                <div className="space-y-2">
                  {ungroupedLessons
                    .sort((a, b) => a.order - b.order)
                    .map((lesson) => (
                      <div
                        key={lesson._id}
                        onClick={() =>
                          onNavigate("courses", "lesson", lesson._id, courseId)
                        }
                        className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-sm font-medium text-indigo-600 dark:text-indigo-400">
                            {lesson.order}
                          </span>
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-slate-100">
                              {lesson.title}
                            </h4>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Topic groups */}
            {sortedTopics.map((topic) => {
              const topicLessons = lessons
                .filter((lesson) => lesson.topicId === topic._id)
                .sort((a, b) => a.order - b.order);

              return (
                <div key={topic._id}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {topic.title}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {topicLessons.length} lessons
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddLesson(topic._id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Lesson
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditTopic(topic._id)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {confirmTopicDeleteId === topic._id ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteTopic(topic._id)}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmTopicDeleteId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmTopicDeleteId(topic._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {topicLessons.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                      <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">No lessons in this topic yet</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => onAddLesson(topic._id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Lesson
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {topicLessons.map((lesson) => (
                        <div
                          key={lesson._id}
                          onClick={() =>
                            onNavigate("courses", "lesson", lesson._id, courseId)
                          }
                          className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-sm font-medium text-indigo-600 dark:text-indigo-400">
                              {lesson.order}
                            </span>
                            <div>
                              <h4 className="font-medium text-slate-900 dark:text-slate-100">
                                {lesson.title}
                              </h4>
                            </div>
                          </div>
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
    </div>
  );
}
