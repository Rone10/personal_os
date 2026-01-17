import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

describe("collections", () => {
  describe("list", () => {
    it("returns empty array when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const collections = await t.query(api.study.collections.list, {});
      expect(collections).toEqual([]);
    });

    it("returns only user's collections", async () => {
      const t = convexTest(schema, modules);
      const asUser1 = t.withIdentity({ subject: "user_1" });
      const asUser2 = t.withIdentity({ subject: "user_2" });

      await asUser1.mutation(api.study.collections.create, {
        title: "User1 Collection",
      });
      await asUser2.mutation(api.study.collections.create, {
        title: "User2 Collection",
      });

      const user1Collections = await asUser1.query(api.study.collections.list, {});
      expect(user1Collections).toHaveLength(1);
      expect(user1Collections[0].title).toBe("User1 Collection");

      const user2Collections = await asUser2.query(api.study.collections.list, {});
      expect(user2Collections).toHaveLength(1);
      expect(user2Collections[0].title).toBe("User2 Collection");
    });
  });

  describe("getById", () => {
    it("returns null when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "Test Collection",
      });

      const collection = await t.query(api.study.collections.getById, {
        id: collectionId,
      });
      expect(collection).toBeNull();
    });

    it("returns null for another user's collection", async () => {
      const t = convexTest(schema, modules);
      const asUser1 = t.withIdentity({ subject: "user_1" });
      const asUser2 = t.withIdentity({ subject: "user_2" });

      const collectionId = await asUser1.mutation(api.study.collections.create, {
        title: "User1's Collection",
      });

      const collection = await asUser2.query(api.study.collections.getById, {
        id: collectionId,
      });
      expect(collection).toBeNull();
    });

    it("returns collection for owner", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "My Collection",
        description: "Test description",
      });

      const collection = await asUser.query(api.study.collections.getById, {
        id: collectionId,
      });
      expect(collection).not.toBeNull();
      expect(collection?.title).toBe("My Collection");
      expect(collection?.description).toBe("Test description");
    });
  });

  describe("create", () => {
    it("throws when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      await expect(
        t.mutation(api.study.collections.create, { title: "Test" })
      ).rejects.toThrow("Unauthorized");
    });

    it("creates collection with empty items array", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "My Collection",
      });

      const collection = await asUser.query(api.study.collections.getById, {
        id: collectionId,
      });
      expect(collection?.title).toBe("My Collection");
      expect(collection?.items).toEqual([]);
    });

    it("creates collection with optional fields", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "Full Collection",
        description: "A complete collection",
        contentJson: { type: "doc", content: [] },
      });

      const collection = await asUser.query(api.study.collections.getById, {
        id: collectionId,
      });
      expect(collection?.description).toBe("A complete collection");
      expect(collection?.contentJson).toEqual({ type: "doc", content: [] });
    });

    it("creates collection with initial items", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "Pre-filled Collection",
        items: [
          { entityType: "word", entityId: "word_123", order: 0, annotation: "First" },
          { entityType: "verse", entityId: "verse_456", order: 1 },
        ],
      });

      const collection = await asUser.query(api.study.collections.getById, {
        id: collectionId,
      });
      expect(collection?.items).toHaveLength(2);
      expect(collection?.items[0].entityType).toBe("word");
      expect(collection?.items[0].annotation).toBe("First");
    });
  });

  describe("update", () => {
    it("throws when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });
      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "Test",
      });

      await expect(
        t.mutation(api.study.collections.update, { id: collectionId, title: "New" })
      ).rejects.toThrow("Unauthorized");
    });

    it("prevents updating another user's collection", async () => {
      const t = convexTest(schema, modules);
      const asUser1 = t.withIdentity({ subject: "user_1" });
      const asUser2 = t.withIdentity({ subject: "user_2" });

      const collectionId = await asUser1.mutation(api.study.collections.create, {
        title: "User1's Collection",
      });

      await expect(
        asUser2.mutation(api.study.collections.update, {
          id: collectionId,
          title: "Hacked",
        })
      ).rejects.toThrow("Unauthorized");
    });

    it("performs partial updates", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "Original",
        description: "Original description",
      });

      await asUser.mutation(api.study.collections.update, {
        id: collectionId,
        title: "Updated",
      });

      const collection = await asUser.query(api.study.collections.getById, {
        id: collectionId,
      });
      expect(collection?.title).toBe("Updated");
      expect(collection?.description).toBe("Original description"); // unchanged
    });
  });

  describe("remove", () => {
    it("throws when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });
      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "Test",
      });

      await expect(
        t.mutation(api.study.collections.remove, { id: collectionId })
      ).rejects.toThrow("Unauthorized");
    });

    it("prevents deleting another user's collection", async () => {
      const t = convexTest(schema, modules);
      const asUser1 = t.withIdentity({ subject: "user_1" });
      const asUser2 = t.withIdentity({ subject: "user_2" });

      const collectionId = await asUser1.mutation(api.study.collections.create, {
        title: "User1's Collection",
      });

      await expect(
        asUser2.mutation(api.study.collections.remove, { id: collectionId })
      ).rejects.toThrow("Unauthorized");
    });

    it("deletes collection successfully", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "To Delete",
      });

      await asUser.mutation(api.study.collections.remove, { id: collectionId });

      const collection = await asUser.query(api.study.collections.getById, {
        id: collectionId,
      });
      expect(collection).toBeNull();
    });
  });

  describe("addItem", () => {
    it("throws when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });
      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "Test",
      });

      await expect(
        t.mutation(api.study.collections.addItem, {
          collectionId,
          entityType: "word",
          entityId: "word_123",
        })
      ).rejects.toThrow("Unauthorized");
    });

    it("adds item to collection", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "Test Collection",
      });

      await asUser.mutation(api.study.collections.addItem, {
        collectionId,
        entityType: "word",
        entityId: "word_123",
        annotation: "Important word",
      });

      const collection = await asUser.query(api.study.collections.getById, {
        id: collectionId,
      });
      expect(collection?.items).toHaveLength(1);
      expect(collection?.items[0].entityType).toBe("word");
      expect(collection?.items[0].entityId).toBe("word_123");
      expect(collection?.items[0].annotation).toBe("Important word");
      expect(collection?.items[0].order).toBe(0);
    });

    it("assigns correct order to new items", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "Test",
      });

      await asUser.mutation(api.study.collections.addItem, {
        collectionId,
        entityType: "word",
        entityId: "word_1",
      });
      await asUser.mutation(api.study.collections.addItem, {
        collectionId,
        entityType: "word",
        entityId: "word_2",
      });

      const collection = await asUser.query(api.study.collections.getById, {
        id: collectionId,
      });
      expect(collection?.items[0].order).toBe(0);
      expect(collection?.items[1].order).toBe(1);
    });

    it("prevents duplicate items", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "Test",
      });

      await asUser.mutation(api.study.collections.addItem, {
        collectionId,
        entityType: "word",
        entityId: "word_123",
      });

      await expect(
        asUser.mutation(api.study.collections.addItem, {
          collectionId,
          entityType: "word",
          entityId: "word_123",
        })
      ).rejects.toThrow("Item already exists");
    });

    it("allows same entity ID with different type", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "Test",
      });

      await asUser.mutation(api.study.collections.addItem, {
        collectionId,
        entityType: "word",
        entityId: "entity_123",
      });
      await asUser.mutation(api.study.collections.addItem, {
        collectionId,
        entityType: "verse",
        entityId: "entity_123",
      });

      const collection = await asUser.query(api.study.collections.getById, {
        id: collectionId,
      });
      expect(collection?.items).toHaveLength(2);
    });
  });

  describe("removeItem", () => {
    it("removes item from collection", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "Test",
      });

      await asUser.mutation(api.study.collections.addItem, {
        collectionId,
        entityType: "word",
        entityId: "word_123",
      });

      await asUser.mutation(api.study.collections.removeItem, {
        collectionId,
        entityType: "word",
        entityId: "word_123",
      });

      const collection = await asUser.query(api.study.collections.getById, {
        id: collectionId,
      });
      expect(collection?.items).toHaveLength(0);
    });

    it("does nothing if item doesn't exist", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "Test",
      });

      // Should not throw
      await asUser.mutation(api.study.collections.removeItem, {
        collectionId,
        entityType: "word",
        entityId: "nonexistent",
      });

      const collection = await asUser.query(api.study.collections.getById, {
        id: collectionId,
      });
      expect(collection?.items).toHaveLength(0);
    });
  });

  describe("reorderItems", () => {
    it("reorders items while preserving annotations", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const collectionId = await asUser.mutation(api.study.collections.create, {
        title: "Test",
      });

      await asUser.mutation(api.study.collections.addItem, {
        collectionId,
        entityType: "word",
        entityId: "word_1",
        annotation: "First annotation",
      });
      await asUser.mutation(api.study.collections.addItem, {
        collectionId,
        entityType: "word",
        entityId: "word_2",
        annotation: "Second annotation",
      });

      // Swap the order
      await asUser.mutation(api.study.collections.reorderItems, {
        collectionId,
        items: [
          { entityType: "word", entityId: "word_1", order: 1 },
          { entityType: "word", entityId: "word_2", order: 0 },
        ],
      });

      const collection = await asUser.query(api.study.collections.getById, {
        id: collectionId,
      });

      // Items should be sorted by order
      expect(collection?.items[0].entityId).toBe("word_2");
      expect(collection?.items[0].order).toBe(0);
      expect(collection?.items[0].annotation).toBe("Second annotation"); // preserved

      expect(collection?.items[1].entityId).toBe("word_1");
      expect(collection?.items[1].order).toBe(1);
      expect(collection?.items[1].annotation).toBe("First annotation"); // preserved
    });
  });

  describe("getCollectionsForEntity", () => {
    it("returns empty array when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const collections = await t.query(api.study.collections.getCollectionsForEntity, {
        entityType: "word",
        entityId: "word_123",
      });
      expect(collections).toEqual([]);
    });

    it("returns collections containing the entity", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const collection1Id = await asUser.mutation(api.study.collections.create, {
        title: "Collection 1",
      });
      const collection2Id = await asUser.mutation(api.study.collections.create, {
        title: "Collection 2",
      });
      await asUser.mutation(api.study.collections.create, {
        title: "Collection 3 (no match)",
      });

      await asUser.mutation(api.study.collections.addItem, {
        collectionId: collection1Id,
        entityType: "word",
        entityId: "word_123",
      });
      await asUser.mutation(api.study.collections.addItem, {
        collectionId: collection2Id,
        entityType: "word",
        entityId: "word_123",
      });

      const collections = await asUser.query(
        api.study.collections.getCollectionsForEntity,
        { entityType: "word", entityId: "word_123" }
      );
      expect(collections).toHaveLength(2);

      const titles = collections.map((c) => c.title);
      expect(titles).toContain("Collection 1");
      expect(titles).toContain("Collection 2");
    });
  });
});
