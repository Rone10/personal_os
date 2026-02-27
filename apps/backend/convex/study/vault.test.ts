import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

describe("vault", () => {
  it("returns empty arrays for unauthenticated taxonomy queries", async () => {
    const t = convexTest(schema, modules);
    const subjects = await t.query(api.study.vault.listSubjects, {});
    const categories = await t.query(api.study.vault.listCategories, {});
    const topics = await t.query(api.study.vault.listTopics, {});
    const entries = await t.query(api.study.vault.listEntries, {});

    expect(subjects).toEqual([]);
    expect(categories).toEqual([]);
    expect(topics).toEqual([]);
    expect(entries).toEqual([]);
  });

  it("creates taxonomy and entry, scoped per user", async () => {
    const t = convexTest(schema, modules);
    const asUser1 = t.withIdentity({ subject: "user_1" });
    const asUser2 = t.withIdentity({ subject: "user_2" });

    const subjectId = await asUser1.mutation(api.study.vault.createSubject, {
      name: "Grammar",
    });
    const categoryId = await asUser1.mutation(api.study.vault.createCategory, {
      subjectId,
      name: "Nouns",
    });
    const topicId = await asUser1.mutation(api.study.vault.createTopic, {
      subjectId,
      categoryId,
      name: "Objects",
    });

    await asUser1.mutation(api.study.vault.createEntry, {
      entryType: "word",
      text: "كتاب",
      transliteration: "kitaab",
      subjectId,
      categoryId,
      topicId,
    });

    const user1Entries = await asUser1.query(api.study.vault.listEntries, {});
    const user2Entries = await asUser2.query(api.study.vault.listEntries, {});
    expect(user1Entries).toHaveLength(1);
    expect(user1Entries[0].text).toBe("كتاب");
    expect(user2Entries).toHaveLength(0);
  });

  it("rejects duplicate subject slug for same user", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    await asUser.mutation(api.study.vault.createSubject, { name: "Fiqh" });
    await expect(
      asUser.mutation(api.study.vault.createSubject, { name: "fiqh" })
    ).rejects.toThrow("already exists");
  });

  it("validates taxonomy chain when creating entries", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    const subjectA = await asUser.mutation(api.study.vault.createSubject, {
      name: "A",
    });
    const subjectB = await asUser.mutation(api.study.vault.createSubject, {
      name: "B",
    });
    const categoryA = await asUser.mutation(api.study.vault.createCategory, {
      subjectId: subjectA,
      name: "Cat A",
    });
    const topicA = await asUser.mutation(api.study.vault.createTopic, {
      subjectId: subjectA,
      categoryId: categoryA,
      name: "Topic A",
    });

    await expect(
      asUser.mutation(api.study.vault.createEntry, {
        entryType: "word",
        text: "قلم",
        subjectId: subjectB,
        categoryId: categoryA,
        topicId: topicA,
      })
    ).rejects.toThrow("Category does not belong to selected subject");
  });

  it("rejects chapter/book mismatch for source metadata", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    const subjectId = await asUser.mutation(api.study.vault.createSubject, {
      name: "Morphology",
    });
    const categoryId = await asUser.mutation(api.study.vault.createCategory, {
      subjectId,
      name: "Forms",
    });
    const topicId = await asUser.mutation(api.study.vault.createTopic, {
      subjectId,
      categoryId,
      name: "Form I",
    });

    const bookA = await asUser.mutation(api.study.books.createBook, {
      title: "Book A",
    });
    const bookB = await asUser.mutation(api.study.books.createBook, {
      title: "Book B",
    });
    const chapterB = await asUser.mutation(api.study.books.createChapter, {
      bookId: bookB,
      title: "Chapter B1",
    });

    await expect(
      asUser.mutation(api.study.vault.createEntry, {
        entryType: "phrase",
        text: "في البيت",
        subjectId,
        categoryId,
        topicId,
        bookId: bookA,
        chapterId: chapterB,
      })
    ).rejects.toThrow("Chapter does not belong to selected book");
  });

  it("filters entries by tag using existing tag system", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    const subjectId = await asUser.mutation(api.study.vault.createSubject, {
      name: "Vocabulary",
    });
    const categoryId = await asUser.mutation(api.study.vault.createCategory, {
      subjectId,
      name: "Daily",
    });
    const topicId = await asUser.mutation(api.study.vault.createTopic, {
      subjectId,
      categoryId,
      name: "Home",
    });

    const tagId = await asUser.mutation(api.study.tags.create, {
      name: "essential",
    });

    const entryA = await asUser.mutation(api.study.vault.createEntry, {
      entryType: "word",
      text: "بيت",
      subjectId,
      categoryId,
      topicId,
    });
    await asUser.mutation(api.study.vault.createEntry, {
      entryType: "word",
      text: "باب",
      subjectId,
      categoryId,
      topicId,
    });

    await asUser.mutation(api.study.tags.tagEntity, {
      tagId,
      entityType: "vaultEntry",
      entityId: entryA,
    });

    const filtered = await asUser.query(api.study.vault.listEntries, { tagId });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].text).toBe("بيت");
  });

  it("validates reference payloads and supports reordering", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    const subjectId = await asUser.mutation(api.study.vault.createSubject, {
      name: "References",
    });
    const categoryId = await asUser.mutation(api.study.vault.createCategory, {
      subjectId,
      name: "Cross-links",
    });
    const topicId = await asUser.mutation(api.study.vault.createTopic, {
      subjectId,
      categoryId,
      name: "Internal",
    });
    const entryId = await asUser.mutation(api.study.vault.createEntry, {
      entryType: "word",
      text: "نور",
      subjectId,
      categoryId,
      topicId,
    });

    await expect(
      asUser.mutation(api.study.vault.createReference, {
        entryId,
        referenceType: "external",
        url: "not-a-url",
        label: "broken",
      })
    ).rejects.toThrow("valid URL");

    const wordId = await asUser.mutation(api.study.words.create, {
      text: "هُدًى",
      language: "arabic",
      meanings: [{ definition: "guidance" }],
    });

    const internalRef = await asUser.mutation(api.study.vault.createReference, {
      entryId,
      referenceType: "internal",
      targetType: "word",
      targetId: wordId,
      label: "Related word",
    });

    const externalRef = await asUser.mutation(api.study.vault.createReference, {
      entryId,
      referenceType: "external",
      url: "https://example.com",
      label: "External source",
    });

    await asUser.mutation(api.study.vault.reorderReferences, {
      entryId,
      items: [
        { id: internalRef, order: 2 },
        { id: externalRef, order: 1 },
      ],
    });

    const references = await asUser.query(api.study.vault.listReferences, {
      entryId,
    });
    expect(references).toHaveLength(2);
    expect(references[0].label).toBe("External source");
    expect(references[1].label).toBe("Related word");
  });
});

