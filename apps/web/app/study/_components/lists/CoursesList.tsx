"use client";

import { Plus, GraduationCap, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Course {
  _id: string;
  title: string;
  description?: string;
  source?: string;
}

interface Lesson {
  _id: string;
  courseId: string;
  title: string;
  order: number;
}

interface CoursesListProps {
  courses: Course[];
  lessons: Lesson[];
  selectedCourseId?: string;
  selectedLessonId?: string;
  onSelectCourse: (id: string) => void;
  onSelectLesson: (id: string, courseId: string) => void;
  onAdd?: () => void;
}

export default function CoursesList({
  courses,
  lessons,
  selectedCourseId,
  selectedLessonId,
  onSelectCourse,
  onSelectLesson,
  onAdd,
}: CoursesListProps) {

  const getLessonsForCourse = (courseId: string) =>
    lessons.filter((l) => l.courseId === courseId).sort((a, b) => a.order - b.order);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-slate-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Courses
            </h1>
            <p className="text-sm text-slate-500">
              {courses.length} courses, {lessons.length} lessons
            </p>
          </div>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Course
        </Button>
      </div>

      {/* Course list */}
      {courses.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No courses yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Create courses to organize your learning
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={onAdd}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Course
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => {
            const courseLessons = getLessonsForCourse(course._id);
            const isExpanded = selectedCourseId === course._id;

            return (
              <div
                key={course._id}
                className={cn(
                  "bg-white dark:bg-slate-800 rounded-lg border overflow-hidden",
                  isExpanded
                    ? "border-blue-500"
                    : "border-slate-200 dark:border-slate-700"
                )}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  onClick={() => onSelectCourse(course._id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-slate-100">
                        {course.title}
                      </h3>
                      {course.description && (
                        <p className="text-sm text-slate-500 mt-1">
                          {course.description}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {courseLessons.length} lessons
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

                {isExpanded && courseLessons.length > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-700">
                    {courseLessons.map((lesson) => (
                      <div
                        key={lesson._id}
                        onClick={() => onSelectLesson(lesson._id, course._id)}
                        className={cn(
                          "px-4 py-3 pl-8 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b last:border-b-0 border-slate-100 dark:border-slate-700",
                          selectedLessonId === lesson._id &&
                            "bg-blue-50 dark:bg-blue-900/20"
                        )}
                      >
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {lesson.order}. {lesson.title}
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
