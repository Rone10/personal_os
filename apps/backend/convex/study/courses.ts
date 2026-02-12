/**
 * Courses and Lessons CRUD
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, verifyOwnership, now } from "./_helpers";

// ============================================================================
// COURSES
// ============================================================================

/**
 * List all courses for the current user.
 */
export const listCourses = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("courses")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

/**
 * Get a single course by ID.
 */
export const getCourse = query({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const course = await ctx.db.get(args.id);
    if (!course || course.userId !== identity.subject) return null;
    return course;
  },
});

/**
 * Get course with its lessons.
 */
export const getCourseWithLessons = query({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const course = await ctx.db.get(args.id);
    if (!course || course.userId !== identity.subject) return null;

    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_course", (q) => q.eq("courseId", args.id))
      .collect();

    return { course, lessons };
  },
});

/**
 * Create a new course.
 */
export const createCourse = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    descriptionJson: v.optional(v.any()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const timestamp = now();

    // Get max order for ordering
    const courses = await ctx.db
      .query("courses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const maxOrder = Math.max(0, ...courses.map((c) => c.order ?? 0));

    return await ctx.db.insert("courses", {
      userId,
      title: args.title,
      description: args.description,
      descriptionJson: args.descriptionJson,
      source: args.source,
      order: maxOrder + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

/**
 * Update an existing course.
 */
export const updateCourse = mutation({
  args: {
    id: v.id("courses"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    descriptionJson: v.optional(v.any()),
    source: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const course = await ctx.db.get(args.id);
    verifyOwnership(course, userId, "Course");

    const updates: Record<string, unknown> = { updatedAt: now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.descriptionJson !== undefined) updates.descriptionJson = args.descriptionJson;
    if (args.source !== undefined) updates.source = args.source;
    if (args.order !== undefined) updates.order = args.order;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete a course and all its lessons.
 */
export const removeCourse = mutation({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const course = await ctx.db.get(args.id);
    verifyOwnership(course, userId, "Course");

    // Delete all lessons in this course
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_course", (q) => q.eq("courseId", args.id))
      .collect();

    for (const lesson of lessons) {
      // Delete notes attached to this lesson
      const notes = await ctx.db
        .query("studyNotes")
        .withIndex("by_user_parent", (q) =>
          q.eq("userId", userId).eq("parentType", "lesson").eq("parentId", lesson._id)
        )
        .collect();
      for (const note of notes) {
        await ctx.db.delete(note._id);
      }

      // Delete entity tags for this lesson
      const entityTags = await ctx.db
        .query("entityTags")
        .withIndex("by_entity", (q) =>
          q.eq("entityType", "lesson").eq("entityId", lesson._id)
        )
        .collect();
      for (const et of entityTags) {
        await ctx.db.delete(et._id);
      }

      await ctx.db.delete(lesson._id);
    }

    const topics = await ctx.db
      .query("topics")
      .withIndex("by_course", (q) => q.eq("courseId", args.id))
      .collect();
    for (const topic of topics) {
      await ctx.db.delete(topic._id);
    }

    await ctx.db.delete(args.id);
  },
});

// ============================================================================
// TOPICS
// ============================================================================

/**
 * List topics for a course.
 */
export const listTopics = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const course = await ctx.db.get(args.courseId);
    if (!course || course.userId !== identity.subject) return [];

    return await ctx.db
      .query("topics")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
  },
});

/**
 * Get a single topic by ID.
 */
export const getTopic = query({
  args: { id: v.id("topics") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const topic = await ctx.db.get(args.id);
    if (!topic || topic.userId !== identity.subject) return null;
    return topic;
  },
});

/**
 * Create a new topic.
 */
export const createTopic = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const course = await ctx.db.get(args.courseId);
    verifyOwnership(course, userId, "Course");

    const timestamp = now();
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
    const maxOrder = Math.max(0, ...topics.map((t) => t.order));

    return await ctx.db.insert("topics", {
      userId,
      courseId: args.courseId,
      title: args.title,
      order: maxOrder + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

/**
 * Update an existing topic.
 */
export const updateTopic = mutation({
  args: {
    id: v.id("topics"),
    title: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const topic = await ctx.db.get(args.id);
    verifyOwnership(topic, userId, "Topic");

    const updates: Record<string, unknown> = { updatedAt: now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.order !== undefined) updates.order = args.order;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete a topic and ungroup its lessons.
 */
export const removeTopic = mutation({
  args: { id: v.id("topics") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const topic = await ctx.db.get(args.id);
    verifyOwnership(topic, userId, "Topic");

    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_course", (q) => q.eq("courseId", topic.courseId))
      .collect();

    for (const lesson of lessons) {
      if (lesson.topicId === args.id) {
        await ctx.db.patch(lesson._id, { topicId: null, updatedAt: now() });
      }
    }

    await ctx.db.delete(args.id);
  },
});

// ============================================================================
// LESSONS
// ============================================================================

/**
 * List lessons for a course.
 */
export const listLessons = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify course ownership
    const course = await ctx.db.get(args.courseId);
    if (!course || course.userId !== identity.subject) return [];

    return await ctx.db
      .query("lessons")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
  },
});

/**
 * List all lessons for the current user (across all courses).
 * Used by LinkPicker to reference lessons from notes.
 */
export const listAllLessons = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get all user's lessons
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    // Hydrate with course and topic titles for display
    const lessonsWithCourse = await Promise.all(
      lessons.map(async (lesson) => {
        const course = await ctx.db.get(lesson.courseId);
        const topic = lesson.topicId ? await ctx.db.get(lesson.topicId) : null;
        return {
          ...lesson,
          courseTitle: course?.title,
          topicTitle: topic?.title,
        };
      })
    );

    return lessonsWithCourse;
  },
});

/**
 * Get a single lesson by ID.
 */
export const getLesson = query({
  args: { id: v.id("lessons") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const lesson = await ctx.db.get(args.id);
    if (!lesson || lesson.userId !== identity.subject) return null;
    return lesson;
  },
});

/**
 * Get lesson with its notes.
 */
export const getLessonWithNotes = query({
  args: { id: v.id("lessons") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const lesson = await ctx.db.get(args.id);
    if (!lesson || lesson.userId !== identity.subject) return null;

    const notes = await ctx.db
      .query("studyNotes")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", identity.subject).eq("parentType", "lesson").eq("parentId", args.id)
      )
      .collect();

    // Get parent course
    const course = await ctx.db.get(lesson.courseId);

    return { lesson, course, notes };
  },
});

/**
 * Create a new lesson.
 */
export const createLesson = mutation({
  args: {
    courseId: v.id("courses"),
    topicId: v.optional(v.union(v.id("topics"), v.null())),
    title: v.string(),
    content: v.optional(v.string()),
    contentJson: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify course ownership
    const course = await ctx.db.get(args.courseId);
    verifyOwnership(course, userId, "Course");

    // Verify topic belongs to course (if provided)
    const normalizedTopicId = args.topicId ?? null;
    if (normalizedTopicId) {
      const topic = await ctx.db.get(normalizedTopicId);
      verifyOwnership(topic, userId, "Topic");
      if (topic.courseId !== args.courseId) {
        throw new Error("Topic does not belong to this course");
      }
    }

    const timestamp = now();

    // Get max order for this topic (or ungrouped lessons)
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
    const maxOrder = Math.max(
      0,
      ...lessons
        .filter((l) => (l.topicId ?? null) === normalizedTopicId)
        .map((l) => l.order)
    );

    return await ctx.db.insert("lessons", {
      userId,
      courseId: args.courseId,
      topicId: normalizedTopicId ?? undefined,
      title: args.title,
      content: args.content,
      contentJson: args.contentJson,
      order: maxOrder + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

/**
 * Update an existing lesson.
 */
export const updateLesson = mutation({
  args: {
    id: v.id("lessons"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    contentJson: v.optional(v.any()),
    topicId: v.optional(v.union(v.id("topics"), v.null())),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const lesson = await ctx.db.get(args.id);
    verifyOwnership(lesson, userId, "Lesson");

    const updates: Record<string, unknown> = { updatedAt: now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.contentJson !== undefined) updates.contentJson = args.contentJson;
    if (args.order !== undefined) updates.order = args.order;

    if (args.topicId !== undefined) {
      const normalizedTopicId = args.topicId ?? null;
      if (normalizedTopicId) {
        const topic = await ctx.db.get(normalizedTopicId);
        verifyOwnership(topic, userId, "Topic");
        if (topic.courseId !== lesson.courseId) {
          throw new Error("Topic does not belong to this course");
        }
      }

      if (normalizedTopicId !== (lesson.topicId ?? null)) {
        const lessons = await ctx.db
          .query("lessons")
          .withIndex("by_course", (q) => q.eq("courseId", lesson.courseId))
          .collect();
        const maxOrder = Math.max(
          0,
          ...lessons
            .filter((l) => (l.topicId ?? null) === normalizedTopicId)
            .map((l) => l.order)
        );
        updates.order = maxOrder + 1;
      }

      updates.topicId = normalizedTopicId;
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete a lesson.
 */
export const removeLesson = mutation({
  args: { id: v.id("lessons") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const lesson = await ctx.db.get(args.id);
    verifyOwnership(lesson, userId, "Lesson");

    // Delete notes attached to this lesson
    const notes = await ctx.db
      .query("studyNotes")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", userId).eq("parentType", "lesson").eq("parentId", args.id)
      )
      .collect();
    for (const note of notes) {
      await ctx.db.delete(note._id);
    }

    // Delete entity tags
    const entityTags = await ctx.db
      .query("entityTags")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "lesson").eq("entityId", args.id)
      )
      .collect();
    for (const et of entityTags) {
      await ctx.db.delete(et._id);
    }

    await ctx.db.delete(args.id);
  },
});
