import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("projects", () => {
  describe("get", () => {
    it("returns empty array when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const projects = await t.query(api.projects.get, {});
      expect(projects).toEqual([]);
    });

    it("returns only user's projects", async () => {
      const t = convexTest(schema, modules);
      const asUser1 = t.withIdentity({ subject: "user_1" });
      const asUser2 = t.withIdentity({ subject: "user_2" });

      await asUser1.mutation(api.projects.create, {
        name: "User1 Project",
        slug: "u1",
      });
      await asUser2.mutation(api.projects.create, {
        name: "User2 Project",
        slug: "u2",
      });

      const user1Projects = await asUser1.query(api.projects.get, {});
      expect(user1Projects).toHaveLength(1);
      expect(user1Projects[0].name).toBe("User1 Project");

      const user2Projects = await asUser2.query(api.projects.get, {});
      expect(user2Projects).toHaveLength(1);
      expect(user2Projects[0].name).toBe("User2 Project");
    });

    it("filters by status defaulting to active", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      // Create a project (defaults to active)
      await asUser.mutation(api.projects.create, { name: "Test", slug: "test" });

      const active = await asUser.query(api.projects.get, {});
      const archived = await asUser.query(api.projects.get, { status: "archived" });

      expect(active).toHaveLength(1);
      expect(archived).toHaveLength(0);
    });

    it("filters by status correctly", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const projectId = await asUser.mutation(api.projects.create, {
        name: "Test",
        slug: "test",
      });
      await asUser.mutation(api.projects.updateStatus, {
        id: projectId,
        status: "archived",
      });

      const active = await asUser.query(api.projects.get, { status: "active" });
      const archived = await asUser.query(api.projects.get, { status: "archived" });

      expect(active).toHaveLength(0);
      expect(archived).toHaveLength(1);
    });

    it("filters by idea status", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const projectId = await asUser.mutation(api.projects.create, {
        name: "Idea Project",
        slug: "idea",
      });
      await asUser.mutation(api.projects.updateStatus, {
        id: projectId,
        status: "idea",
      });

      const ideas = await asUser.query(api.projects.get, { status: "idea" });
      expect(ideas).toHaveLength(1);
      expect(ideas[0].name).toBe("Idea Project");
    });
  });

  describe("create", () => {
    it("throws when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      await expect(
        t.mutation(api.projects.create, { name: "Test", slug: "test" })
      ).rejects.toThrow("Unauthorized");
    });

    it("creates project with correct userId and default status", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_123" });

      await asUser.mutation(api.projects.create, {
        name: "My Project",
        slug: "my-project",
      });

      const projects = await asUser.query(api.projects.get, {});
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe("My Project");
      expect(projects[0].slug).toBe("my-project");
      expect(projects[0].status).toBe("active");
      expect(projects[0].type).toBe("general"); // default type
    });

    it("creates project with optional fields", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      await asUser.mutation(api.projects.create, {
        name: "Full Project",
        slug: "full-project",
        description: "A complete project",
        icon: "📁",
        type: "coding",
      });

      const projects = await asUser.query(api.projects.get, {});
      expect(projects[0].description).toBe("A complete project");
      expect(projects[0].icon).toBe("📁");
      expect(projects[0].type).toBe("coding");
    });
  });

  describe("updateStatus", () => {
    it("throws when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });
      const projectId = await asUser.mutation(api.projects.create, {
        name: "Test",
        slug: "test",
      });

      // Try to update status without auth
      await expect(
        t.mutation(api.projects.updateStatus, { id: projectId, status: "archived" })
      ).rejects.toThrow("Unauthorized");
    });

    it("prevents updating another user's project", async () => {
      const t = convexTest(schema, modules);
      const asUser1 = t.withIdentity({ subject: "user_1" });
      const asUser2 = t.withIdentity({ subject: "user_2" });

      const projectId = await asUser1.mutation(api.projects.create, {
        name: "User1's Project",
        slug: "u1",
      });

      await expect(
        asUser2.mutation(api.projects.updateStatus, {
          id: projectId,
          status: "archived",
        })
      ).rejects.toThrow("Unauthorized");
    });

    it("updates status successfully", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });

      const projectId = await asUser.mutation(api.projects.create, {
        name: "Test",
        slug: "test",
      });

      await asUser.mutation(api.projects.updateStatus, {
        id: projectId,
        status: "archived",
      });

      const archived = await asUser.query(api.projects.get, { status: "archived" });
      expect(archived).toHaveLength(1);
      expect(archived[0].status).toBe("archived");
    });
  });

  describe("update", () => {
    it("throws when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });
      const projectId = await asUser.mutation(api.projects.create, {
        name: "Test",
        slug: "test",
      });

      await expect(
        t.mutation(api.projects.update, { id: projectId, name: "New Name" })
      ).rejects.toThrow("Unauthorized");
    });

    it("prevents updating another user's project", async () => {
      const t = convexTest(schema, modules);
      const asUser1 = t.withIdentity({ subject: "user_1" });
      const asUser2 = t.withIdentity({ subject: "user_2" });

      const projectId = await asUser1.mutation(api.projects.create, {
        name: "User1's Project",
        slug: "u1",
      });

      await expect(
        asUser2.mutation(api.projects.update, { id: projectId, name: "Hacked" })
      ).rejects.toThrow("Unauthorized");
    });

    it("validates name is not empty", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });
      const projectId = await asUser.mutation(api.projects.create, {
        name: "Test",
        slug: "test",
      });

      await expect(
        asUser.mutation(api.projects.update, { id: projectId, name: "   " })
      ).rejects.toThrow("Project name cannot be empty");
    });

    it("validates name length (max 120 chars)", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });
      const projectId = await asUser.mutation(api.projects.create, {
        name: "Test",
        slug: "test",
      });

      await expect(
        asUser.mutation(api.projects.update, { id: projectId, name: "x".repeat(121) })
      ).rejects.toThrow("120 characters");
    });

    it("validates description length (max 2000 chars)", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });
      const projectId = await asUser.mutation(api.projects.create, {
        name: "Test",
        slug: "test",
      });

      await expect(
        asUser.mutation(api.projects.update, {
          id: projectId,
          description: "x".repeat(2001),
        })
      ).rejects.toThrow("2000 characters");
    });

    it("validates icon length (max 8 chars)", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });
      const projectId = await asUser.mutation(api.projects.create, {
        name: "Test",
        slug: "test",
      });

      await expect(
        asUser.mutation(api.projects.update, { id: projectId, icon: "x".repeat(9) })
      ).rejects.toThrow("single emoji");
    });

    it("performs partial updates successfully", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });
      const projectId = await asUser.mutation(api.projects.create, {
        name: "Original",
        slug: "original",
        description: "Original description",
      });

      await asUser.mutation(api.projects.update, {
        id: projectId,
        name: "Updated",
      });

      const projects = await asUser.query(api.projects.get, {});
      expect(projects[0].name).toBe("Updated");
      expect(projects[0].description).toBe("Original description"); // unchanged
    });

    it("trims whitespace from name and description", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity({ subject: "user_1" });
      const projectId = await asUser.mutation(api.projects.create, {
        name: "Test",
        slug: "test",
      });

      await asUser.mutation(api.projects.update, {
        id: projectId,
        name: "  Trimmed Name  ",
        description: "  Trimmed Description  ",
      });

      const projects = await asUser.query(api.projects.get, {});
      expect(projects[0].name).toBe("Trimmed Name");
      expect(projects[0].description).toBe("Trimmed Description");
    });
  });
});
