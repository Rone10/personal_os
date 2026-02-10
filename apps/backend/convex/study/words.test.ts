import { convexTest } from "convex-test";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

describe("words", () => {
  describe("list", () => {
    it("returns empty array when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const words = await t.query(api.study.words.list, {});
      expect(words).toEqual([]);
    });

    it("returns only user's words", async () => {
      const t = convexTest(schema, modules);
      const asUser1 = t.withIdentity({ subject: "user_1" });
      const asUser2 = t.withIdentity({ subject: "user_2" });

      await asUser1.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });
      await asUser2.mutation(api.study.words.create, {
        text: "قلم",
        language: "arabic",
        meanings: [{ definition: "pen" }],
      });

      const user1Words = await asUser1.query(api.study.words.list, {});
      expect(user1Words).toHaveLength(1);
      expect(user1Words[0].text).toBe("كتاب");

      const user2Words = await asUser2.query(api.study.words.list, {});
      expect(user2Words).toHaveLength(1);
      expect(user2Words[0].text).toBe("قلم");
    });

    it("filters by language", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });
      await asUser.mutation(api.study.words.create, {
        text: "book",
        language: "english",
        meanings: [{ definition: "كتاب" }],
      });

      const arabicWords = await asUser.query(api.study.words.list, {
        language: "arabic",
      });
      const englishWords = await asUser.query(api.study.words.list, {
        language: "english",
      });

      expect(arabicWords).toHaveLength(1);
      expect(arabicWords[0].text).toBe("كتاب");
      expect(englishWords).toHaveLength(1);
      expect(englishWords[0].text).toBe("book");
    });

    it("filters by type", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      await asUser.mutation(api.study.words.create, {
        text: "كَتَبَ",
        language: "arabic",
        type: "fiil",
        meanings: [{ definition: "he wrote" }],
      });
      await asUser.mutation(api.study.words.create, {
        text: "كِتَاب",
        language: "arabic",
        type: "ism",
        meanings: [{ definition: "book" }],
      });

      const verbs = await asUser.query(api.study.words.list, { type: "fiil" });
      const nouns = await asUser.query(api.study.words.list, { type: "ism" });

      expect(verbs).toHaveLength(1);
      expect(verbs[0].type).toBe("fiil");
      expect(nouns).toHaveLength(1);
      expect(nouns[0].type).toBe("ism");
    });
  });

  describe("getById", () => {
    it("returns null when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      const word = await t.query(api.study.words.getById, { id: wordId });
      expect(word).toBeNull();
    });

    it("returns null for another user's word", async () => {
      const t = convexTest(schema, modules);
      const asUser1 = t.withIdentity({ subject: "user_1" });
      const asUser2 = t.withIdentity({ subject: "user_2" });

      const wordId = await asUser1.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      const word = await asUser2.query(api.study.words.getById, { id: wordId });
      expect(word).toBeNull();
    });

    it("returns word for owner", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      const word = await asUser.query(api.study.words.getById, { id: wordId });
      expect(word).not.toBeNull();
      expect(word?.text).toBe("كتاب");
    });
  });

  describe("create", () => {
    it("throws when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      await expect(
        t.mutation(api.study.words.create, {
          text: "كتاب",
          language: "arabic",
          meanings: [{ definition: "book" }],
        })
      ).rejects.toThrow("Unauthorized");
    });

    it("creates word with required fields", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      const word = await asUser.query(api.study.words.getById, { id: wordId });
      expect(word?.text).toBe("كتاب");
      expect(word?.language).toBe("arabic");
      expect(word?.meanings).toHaveLength(1);
      expect(word?.meanings[0].definition).toBe("book");
    });

    it("auto-generates search fields for Arabic text", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كِتَابٌ", // with diacritics
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      const word = await asUser.query(api.study.words.getById, { id: wordId });
      expect(word?.normalizedText).toBeDefined();
      expect(word?.diacriticStrippedText).toBe("كتاب"); // diacritics removed
      expect(word?.searchTokens).toBeDefined();
      expect(word?.searchTokens).toContain("كتاب");
    });

    it("sets default mastery level to 1", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      const word = await asUser.query(api.study.words.getById, { id: wordId });
      expect(word?.masteryLevel).toBe(1);
      expect(word?.nextReview).toBeDefined();
    });

    it("creates word with optional fields", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كَتَبَ",
        language: "arabic",
        type: "fiil",
        wazan: "فَعَلَ",
        meanings: [
          { definition: "he wrote", usageContext: "past tense", examples: ["كتب الرسالة"] },
        ],
        grammaticalInfo: { gender: "masculine", number: "singular" },
        transliteration: "kataba",
        aliases: ["كتب"],
        notes: "Common verb",
      });

      const word = await asUser.query(api.study.words.getById, { id: wordId });
      expect(word?.type).toBe("fiil");
      expect(word?.wazan).toBe("فَعَلَ");
      expect(word?.grammaticalInfo?.gender).toBe("masculine");
      expect(word?.transliteration).toBe("kataba");
      expect(word?.aliases).toContain("كتب");
      expect(word?.notes).toBe("Common verb");
    });
  });

  describe("update", () => {
    it("throws when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });
      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      await expect(
        t.mutation(api.study.words.update, { id: wordId, text: "جديد" })
      ).rejects.toThrow("Unauthorized");
    });

    it("prevents updating another user's word", async () => {
      const t = convexTest(schema, modules);
      const asUser1 = t.withIdentity({ subject: "user_1" });
      const asUser2 = t.withIdentity({ subject: "user_2" });

      const wordId = await asUser1.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      await expect(
        asUser2.mutation(api.study.words.update, { id: wordId, text: "hacked" })
      ).rejects.toThrow("Unauthorized");
    });

    it("regenerates search fields when text changes", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      await asUser.mutation(api.study.words.update, {
        id: wordId,
        text: "قَلَمٌ", // with diacritics
      });

      const word = await asUser.query(api.study.words.getById, { id: wordId });
      expect(word?.text).toBe("قَلَمٌ");
      expect(word?.diacriticStrippedText).toBe("قلم");
      expect(word?.searchTokens).toContain("قلم");
    });

    it("performs partial updates", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
        notes: "Original notes",
      });

      await asUser.mutation(api.study.words.update, {
        id: wordId,
        notes: "Updated notes",
      });

      const word = await asUser.query(api.study.words.getById, { id: wordId });
      expect(word?.text).toBe("كتاب"); // unchanged
      expect(word?.notes).toBe("Updated notes");
    });
  });

  describe("remove", () => {
    it("throws when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });
      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      await expect(
        t.mutation(api.study.words.remove, { id: wordId })
      ).rejects.toThrow("Unauthorized");
    });

    it("prevents deleting another user's word", async () => {
      const t = convexTest(schema, modules);
      const asUser1 = t.withIdentity({ subject: "user_1" });
      const asUser2 = t.withIdentity({ subject: "user_2" });

      const wordId = await asUser1.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      await expect(
        asUser2.mutation(api.study.words.remove, { id: wordId })
      ).rejects.toThrow("Unauthorized");
    });

    it("deletes word successfully", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      await asUser.mutation(api.study.words.remove, { id: wordId });

      const word = await asUser.query(api.study.words.getById, { id: wordId });
      expect(word).toBeNull();
    });
  });

  describe("review", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("throws when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });
      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      await expect(
        t.mutation(api.study.words.review, { id: wordId, success: true })
      ).rejects.toThrow("Unauthorized");
    });

    it("increases mastery level on success", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      const result = await asUser.mutation(api.study.words.review, {
        id: wordId,
        success: true,
      });

      expect(result.newLevel).toBe(2);

      const word = await asUser.query(api.study.words.getById, { id: wordId });
      expect(word?.masteryLevel).toBe(2);
    });

    it("decreases mastery level on failure (min 1)", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      // First success to get to level 2
      await asUser.mutation(api.study.words.review, { id: wordId, success: true });
      // Then failure
      const result = await asUser.mutation(api.study.words.review, {
        id: wordId,
        success: false,
      });

      expect(result.newLevel).toBe(1); // decreased back to 1

      const word = await asUser.query(api.study.words.getById, { id: wordId });
      expect(word?.masteryLevel).toBe(1);
    });

    it("caps mastery level at 5", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      // Review successfully 5 times
      for (let i = 0; i < 5; i++) {
        await asUser.mutation(api.study.words.review, { id: wordId, success: true });
      }

      const word = await asUser.query(api.study.words.getById, { id: wordId });
      expect(word?.masteryLevel).toBe(5);
    });

    it("doesn't go below mastery level 1", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      // Fail multiple times
      await asUser.mutation(api.study.words.review, { id: wordId, success: false });
      await asUser.mutation(api.study.words.review, { id: wordId, success: false });

      const word = await asUser.query(api.study.words.getById, { id: wordId });
      expect(word?.masteryLevel).toBe(1);
    });

    it("updates nextReview timestamp", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const wordId = await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      const wordBefore = await asUser.query(api.study.words.getById, { id: wordId });
      const nextReviewBefore = wordBefore?.nextReview;

      await asUser.mutation(api.study.words.review, { id: wordId, success: true });

      const wordAfter = await asUser.query(api.study.words.getById, { id: wordId });
      expect(wordAfter?.nextReview).not.toBe(nextReviewBefore);
    });
  });

  describe("listDue", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns empty array when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const words = await t.query(api.study.words.listDue, {});
      expect(words).toEqual([]);
    });

    it("returns words due for review", async () => {
      const t = convexTest(schema, modules);

      // Set initial time
      vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
      const asUser = t.withIdentity({ subject: "user_1" });

      await asUser.mutation(api.study.words.create, {
        text: "كتاب",
        language: "arabic",
        meanings: [{ definition: "book" }],
      });

      // Move time forward past the 1-day review interval
      vi.setSystemTime(new Date("2024-01-17T12:00:00Z"));

      const dueWords = await asUser.query(api.study.words.listDue, {});
      expect(dueWords).toHaveLength(1);
      expect(dueWords[0].text).toBe("كتاب");
    });
  });

  describe("listRecent", () => {
    it("returns empty array when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const words = await t.query(api.study.words.listRecent, {});
      expect(words).toEqual([]);
    });

    it("returns recent words with default limit of 5", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      // Create 7 words
      for (let i = 0; i < 7; i++) {
        await asUser.mutation(api.study.words.create, {
          text: `كلمة${i}`,
          language: "arabic",
          meanings: [{ definition: `word ${i}` }],
        });
      }

      const recentWords = await asUser.query(api.study.words.listRecent, {});
      expect(recentWords).toHaveLength(5);
    });

    it("respects custom limit", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      for (let i = 0; i < 5; i++) {
        await asUser.mutation(api.study.words.create, {
          text: `كلمة${i}`,
          language: "arabic",
          meanings: [{ definition: `word ${i}` }],
        });
      }

      const recentWords = await asUser.query(api.study.words.listRecent, { limit: 3 });
      expect(recentWords).toHaveLength(3);
    });
  });
});
