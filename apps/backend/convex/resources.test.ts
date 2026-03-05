import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
import { Id } from "./_generated/dataModel";

const resourcesApi = api.resources;

type StudyEntityType =
  | "word"
  | "root"
  | "verse"
  | "hadith"
  | "course"
  | "lesson"
  | "book"
  | "chapter"
  | "note"
  | "tag"
  | "collection"
  | "vaultEntry";

async function createTopicWithCategory(asUser: any) {
  await asUser.mutation(resourcesApi.seedDefaultCategories, {});
  const categories = await asUser.query(resourcesApi.listCategories, {});
  const categoryId = categories[0]._id as Id<"resourceCategories">;
  const resourceId = await asUser.mutation(resourcesApi.createTopic, {
    title: "Buttons",
    description: "UI button resources",
    categoryId,
    tags: ["ui", "components"],
  });
  return { categoryId, resourceId };
}

async function createStudyEntities(asUser: any) {
  const rootId = await asUser.mutation(api.study.roots.create, {
    letters: "ك-ت-ب",
    latinized: "k-t-b",
    coreMeaning: "writing",
  });

  const wordId = await asUser.mutation(api.study.words.create, {
    text: "كتاب",
    language: "arabic",
    rootId,
    meanings: [{ definition: "book" }],
  });

  const verseId = await asUser.mutation(api.study.verses.create, {
    surahNumber: 1,
    ayahStart: 1,
    arabicText: "ٱلْحَمْدُ لِلَّهِ",
    translation: "All praise is due to Allah",
  });

  const hadithId = await asUser.mutation(api.study.hadiths.create, {
    collection: "Bukhari",
    hadithNumber: "1",
    arabicText: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
    translation: "Actions are by intentions",
  });

  const courseId = await asUser.mutation(api.study.courses.createCourse, {
    title: "Arabic Basics",
  });

  const lessonId = await asUser.mutation(api.study.courses.createLesson, {
    courseId,
    title: "Lesson 1",
    topicId: null,
  });

  const bookId = await asUser.mutation(api.study.books.createBook, {
    title: "Study Book",
  });

  const chapterId = await asUser.mutation(api.study.books.createChapter, {
    bookId,
    title: "Chapter 1",
  });

  const noteId = await asUser.mutation(api.study.notes.create, {
    title: "Standalone Note",
    content: "Resource links note",
    parentType: "standalone",
  });

  const tagId = await asUser.mutation(api.study.tags.create, {
    name: "frontend",
  });

  const collectionId = await asUser.mutation(api.study.collections.create, {
    title: "Core UI Set",
  });

  const subjectId = await asUser.mutation(api.study.vault.createSubject, {
    name: "Arabic",
  });
  const categoryId = await asUser.mutation(api.study.vault.createCategory, {
    subjectId,
    name: "Grammar",
  });
  const topicId = await asUser.mutation(api.study.vault.createTopic, {
    subjectId,
    categoryId,
    name: "Nouns",
  });
  const vaultEntryId = await asUser.mutation(api.study.vault.createEntry, {
    entryType: "word",
    text: "مَكْتَب",
    subjectId,
    categoryId,
    topicId,
  });

  return {
    word: wordId,
    root: rootId,
    verse: verseId,
    hadith: hadithId,
    course: courseId,
    lesson: lessonId,
    book: bookId,
    chapter: chapterId,
    note: noteId,
    tag: tagId,
    collection: collectionId,
    vaultEntry: vaultEntryId,
  } as Record<StudyEntityType, string>;
}

describe("resources", () => {
  it("returns empty arrays when unauthenticated", async () => {
    const t = convexTest(schema, modules);

    const categories = await t.query(resourcesApi.listCategories, {});
    const topics = await t.query(resourcesApi.listTopics, {});
    const projectLinks = await t.query(resourcesApi.listForProject, {
      projectId: "fake",
    });
    const studyLinks = await t.query(resourcesApi.listForStudyEntity, {
      studyEntityType: "word",
      studyEntityId: "fake",
    });

    expect(categories).toEqual([]);
    expect(topics).toEqual([]);
    expect(projectLinks).toEqual([]);
    expect(studyLinks).toEqual([]);
  });

  it("seeds default categories idempotently", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    await asUser.mutation(resourcesApi.seedDefaultCategories, {});
    await asUser.mutation(resourcesApi.seedDefaultCategories, {});

    const categories = await asUser.query(resourcesApi.listCategories, {});
    const names = categories.map((c: any) => c.name);
    expect(categories).toHaveLength(3);
    expect(names).toEqual(["coding", "arabic", "quran"]);
  });

  it("creates topics and enforces category ownership", async () => {
    const t = convexTest(schema, modules);
    const asUser1 = t.withIdentity({ subject: "user_1" });
    const asUser2 = t.withIdentity({ subject: "user_2" });

    await asUser1.mutation(resourcesApi.seedDefaultCategories, {});
    await asUser2.mutation(resourcesApi.seedDefaultCategories, {});
    const user1Categories = await asUser1.query(resourcesApi.listCategories, {});
    const user2Categories = await asUser2.query(resourcesApi.listCategories, {});

    const topicId = await asUser1.mutation(resourcesApi.createTopic, {
      title: "Buttons",
      categoryId: user1Categories[0]._id,
    });
    expect(topicId).toBeDefined();

    await expect(
      asUser2.mutation(resourcesApi.createTopic, {
        title: "Bad Topic",
        categoryId: user1Categories[0]._id,
      }),
    ).rejects.toThrow("Unauthorized");

    const user1Topics = await asUser1.query(resourcesApi.listTopics, {});
    const user2Topics = await asUser2.query(resourcesApi.listTopics, {});

    expect(user1Topics).toHaveLength(1);
    expect(user1Topics[0].title).toBe("Buttons");
    expect(user2Topics).toHaveLength(0);
    expect(user2Categories).toHaveLength(3);
  });

  it("prevents deleting category in use and allows deleting after unlink", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });
    const { categoryId, resourceId } = await createTopicWithCategory(asUser);

    await expect(
      asUser.mutation(resourcesApi.removeCategory, { id: categoryId }),
    ).rejects.toThrow("CATEGORY_IN_USE");

    await asUser.mutation(resourcesApi.removeTopic, { id: resourceId });
    await asUser.mutation(resourcesApi.removeCategory, { id: categoryId });

    const categories = await asUser.query(resourcesApi.listCategories, {});
    expect(categories.some((c: any) => c._id === categoryId)).toBe(false);
  });

  it("handles duplicate URL detection and allowDuplicate override", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });
    const { resourceId } = await createTopicWithCategory(asUser);

    await asUser.mutation(resourcesApi.addEntry, {
      resourceId,
      url: "https://example.com/components/buttons?utm_source=test#section",
      label: "Example Buttons",
      purpose: "Button gallery",
    });

    const duplicates = await asUser.query(resourcesApi.findDuplicateEntries, {
      url: "https://example.com/components/buttons",
    });
    expect(duplicates).toHaveLength(1);

    await expect(
      asUser.mutation(resourcesApi.addEntry, {
        resourceId,
        url: "https://example.com/components/buttons/",
        label: "Example Buttons Duplicate",
        purpose: "Duplicate URL",
      }),
    ).rejects.toThrow("DUPLICATE_URL");

    await asUser.mutation(resourcesApi.addEntry, {
      resourceId,
      url: "https://example.com/components/buttons/",
      label: "Example Buttons Duplicate",
      purpose: "Duplicate URL",
      allowDuplicate: true,
    });

    const detail = await asUser.query(resourcesApi.getTopicDetail, { id: resourceId });
    expect(detail).not.toBeNull();
    if (!detail) {
      throw new Error("Expected detail to exist");
    }
    expect(detail.entries).toHaveLength(2);
  });

  it("reorders entries and normalizes order", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });
    const { resourceId } = await createTopicWithCategory(asUser);

    const first = await asUser.mutation(resourcesApi.addEntry, {
      resourceId,
      url: "https://a.com",
      label: "A",
      purpose: "A",
    });
    const second = await asUser.mutation(resourcesApi.addEntry, {
      resourceId,
      url: "https://b.com",
      label: "B",
      purpose: "B",
    });
    const third = await asUser.mutation(resourcesApi.addEntry, {
      resourceId,
      url: "https://c.com",
      label: "C",
      purpose: "C",
    });

    await asUser.mutation(resourcesApi.reorderEntries, {
      resourceId,
      entryIds: [third, first, second],
    });

    const detail = await asUser.query(resourcesApi.getTopicDetail, { id: resourceId });
    expect(detail).not.toBeNull();
    if (!detail) {
      throw new Error("Expected detail to exist");
    }
    expect(detail.entries.map((e: { _id: string }) => e._id)).toEqual([third, first, second]);
    expect(detail.entries.map((e: { order: number }) => e.order)).toEqual([0, 1, 2]);
  });

  it("links and unlinks project targets with dedupe and ownership checks", async () => {
    const t = convexTest(schema, modules);
    const asUser1 = t.withIdentity({ subject: "user_1" });
    const asUser2 = t.withIdentity({ subject: "user_2" });

    const { resourceId } = await createTopicWithCategory(asUser1);
    const projectId = await asUser1.mutation(api.projects.create, {
      name: "Project A",
      slug: "project-a",
    });
    const otherProjectId = await asUser2.mutation(api.projects.create, {
      name: "Project B",
      slug: "project-b",
    });

    await asUser1.mutation(resourcesApi.linkToProject, { resourceId, projectId });
    await asUser1.mutation(resourcesApi.linkToProject, { resourceId, projectId });

    const projectLinks = await asUser1.query(resourcesApi.listForProject, { projectId });
    expect(projectLinks).toHaveLength(1);
    expect(projectLinks[0]._id).toBe(resourceId);

    await expect(
      asUser1.mutation(resourcesApi.linkToProject, {
        resourceId,
        projectId: otherProjectId,
      }),
    ).rejects.toThrow("Unauthorized");

    await asUser1.mutation(resourcesApi.unlinkFromProject, { resourceId, projectId });
    const afterUnlink = await asUser1.query(resourcesApi.listForProject, { projectId });
    expect(afterUnlink).toHaveLength(0);
  });

  it("links and unlinks study targets for all supported entity types", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });
    const asUser2 = t.withIdentity({ subject: "user_2" });

    const { resourceId } = await createTopicWithCategory(asUser);
    const studyIds = await createStudyEntities(asUser);
    const otherStudyIds = await createStudyEntities(asUser2);

    const types: StudyEntityType[] = [
      "word",
      "root",
      "verse",
      "hadith",
      "course",
      "lesson",
      "book",
      "chapter",
      "note",
      "tag",
      "collection",
      "vaultEntry",
    ];

    for (const type of types) {
      await asUser.mutation(resourcesApi.linkToStudyEntity, {
        resourceId,
        studyEntityType: type,
        studyEntityId: studyIds[type],
      });
      await asUser.mutation(resourcesApi.linkToStudyEntity, {
        resourceId,
        studyEntityType: type,
        studyEntityId: studyIds[type],
      });

      const linked = await asUser.query(resourcesApi.listForStudyEntity, {
        studyEntityType: type,
        studyEntityId: studyIds[type],
      });
      expect(linked).toHaveLength(1);
      expect(linked[0]._id).toBe(resourceId);

      await expect(
        asUser.mutation(resourcesApi.linkToStudyEntity, {
          resourceId,
          studyEntityType: type,
          studyEntityId: otherStudyIds[type],
        }),
      ).rejects.toThrow("Unauthorized");
    }

    for (const type of types) {
      await asUser.mutation(resourcesApi.unlinkFromStudyEntity, {
        resourceId,
        studyEntityType: type,
        studyEntityId: studyIds[type],
      });
      const linked = await asUser.query(resourcesApi.listForStudyEntity, {
        studyEntityType: type,
        studyEntityId: studyIds[type],
      });
      expect(linked).toHaveLength(0);
    }
  });

  it("removes topic with cascading entries and target links", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });
    const { resourceId } = await createTopicWithCategory(asUser);
    const projectId = await asUser.mutation(api.projects.create, {
      name: "Cascade Project",
      slug: "cascade-project",
    });

    await asUser.mutation(resourcesApi.addEntry, {
      resourceId,
      url: "https://example.com",
      label: "Example",
      purpose: "Example",
    });
    await asUser.mutation(resourcesApi.linkToProject, { resourceId, projectId });

    await asUser.mutation(resourcesApi.removeTopic, { id: resourceId });

    const topics = await asUser.query(resourcesApi.listTopics, {});
    const projectLinks = await asUser.query(resourcesApi.listForProject, { projectId });
    const duplicates = await asUser.query(resourcesApi.findDuplicateEntries, {
      url: "https://example.com",
    });

    expect(topics).toHaveLength(0);
    expect(projectLinks).toHaveLength(0);
    expect(duplicates).toHaveLength(0);
  });

  it("enforces user isolation for topic read and mutations", async () => {
    const t = convexTest(schema, modules);
    const asUser1 = t.withIdentity({ subject: "user_1" });
    const asUser2 = t.withIdentity({ subject: "user_2" });

    const { resourceId, categoryId } = await createTopicWithCategory(asUser1);

    const detailForUser2 = await asUser2.query(resourcesApi.getTopicDetail, {
      id: resourceId,
    });
    expect(detailForUser2).toBeNull();

    await expect(
      asUser2.mutation(resourcesApi.updateTopic, {
        id: resourceId,
        title: "Hacked",
      }),
    ).rejects.toThrow("Unauthorized");

    await expect(
      asUser2.mutation(resourcesApi.removeCategory, { id: categoryId }),
    ).rejects.toThrow("Unauthorized");
  });
});
