import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("ideas", () => {
  it("returns empty array when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const ideas = await t.query(api.ideas.list, {});
    expect(ideas).toEqual([]);
  });

  it("creates and lists ideas for the authenticated user only", async () => {
    const t = convexTest(schema, modules);
    const asUser1 = t.withIdentity({ subject: "user_1" });
    const asUser2 = t.withIdentity({ subject: "user_2" });

    await asUser1.mutation(api.ideas.create, {
      title: "Idea A",
      problemOneLiner: "Help solo founders prioritize faster",
    });

    await asUser2.mutation(api.ideas.create, {
      title: "Idea B",
      problemOneLiner: "Automate onboarding docs",
    });

    const user1Ideas = await asUser1.query(api.ideas.list, {});
    expect(user1Ideas).toHaveLength(1);
    expect(user1Ideas[0].title).toBe("Idea A");

    const user2Ideas = await asUser2.query(api.ideas.list, {});
    expect(user2Ideas).toHaveLength(1);
    expect(user2Ideas[0].title).toBe("Idea B");
  });

  it("updates status and optional fields", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    const ideaId = await asUser.mutation(api.ideas.create, {
      title: "Status Test",
      problemOneLiner: "Track idea lifecycle simply",
    });

    await asUser.mutation(api.ideas.update, {
      id: ideaId,
      status: "worth_exploring",
      referenceUrl: "https://example.com/ref",
      notes: "Potential B2B angle",
    });

    const idea = await asUser.query(api.ideas.getById, { id: ideaId });
    expect(idea?.status).toBe("worth_exploring");
    expect(idea?.referenceUrl).toBe("https://example.com/ref");
    expect(idea?.notes).toBe("Potential B2B angle");
  });

  it("links and unlinks ideas to projects and prompts", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    const ideaId = await asUser.mutation(api.ideas.create, {
      title: "Link Test",
      problemOneLiner: "Connect idea context",
    });

    const projectId = await asUser.mutation(api.projects.create, {
      name: "Idea Project",
      slug: "idea-project",
    });

    const promptId = await asUser.mutation(api.prompts.create, {
      title: "Validation Prompt",
      content: "Evaluate this startup idea",
      tags: ["ideas"],
    });

    await asUser.mutation(api.ideas.linkProject, { ideaId, projectId });
    await asUser.mutation(api.ideas.linkPrompt, { ideaId, promptId });

    const linkedProjects = await asUser.query(api.ideas.getLinkedProjects, { ideaId });
    const linkedPrompts = await asUser.query(api.ideas.getLinkedPrompts, { ideaId });

    expect(linkedProjects).toHaveLength(1);
    expect(linkedProjects[0]._id).toBe(projectId);
    expect(linkedPrompts).toHaveLength(1);
    expect(linkedPrompts[0]._id).toBe(promptId);

    await asUser.mutation(api.ideas.unlinkProject, { ideaId, projectId });
    await asUser.mutation(api.ideas.unlinkPrompt, { ideaId, promptId });

    const afterUnlinkProjects = await asUser.query(api.ideas.getLinkedProjects, { ideaId });
    const afterUnlinkPrompts = await asUser.query(api.ideas.getLinkedPrompts, { ideaId });

    expect(afterUnlinkProjects).toHaveLength(0);
    expect(afterUnlinkPrompts).toHaveLength(0);
  });

  it("creates a project from idea and links it", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    const ideaId = await asUser.mutation(api.ideas.create, {
      title: "Project Seed Idea",
      problemOneLiner: "Move winning ideas into execution quickly",
    });

    const projectId = await asUser.mutation(api.ideas.createProjectFromIdea, {
      ideaId,
      projectName: "Project Seed",
    });

    const linkedProjects = await asUser.query(api.ideas.getLinkedProjects, { ideaId });

    expect(projectId).toBeDefined();
    expect(linkedProjects).toHaveLength(1);
    expect(linkedProjects[0].name).toBe("Project Seed");
  });
});
