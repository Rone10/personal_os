import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyOwnership, computeNextReview, now } from "./_helpers";

describe("verifyOwnership", () => {
  it("passes for document owned by user", () => {
    const doc = { userId: "user_123", name: "Test" };
    expect(() => verifyOwnership(doc, "user_123")).not.toThrow();
  });

  it("throws for null document", () => {
    expect(() => verifyOwnership(null, "user_123")).toThrow("Document not found");
  });

  it("throws for document owned by different user", () => {
    const doc = { userId: "user_456", name: "Test" };
    expect(() => verifyOwnership(doc, "user_123")).toThrow(
      "Unauthorized access to Document"
    );
  });

  it("uses custom entity name in error messages", () => {
    expect(() => verifyOwnership(null, "user_123", "Project")).toThrow(
      "Project not found"
    );

    const doc = { userId: "user_456", name: "Test" };
    expect(() => verifyOwnership(doc, "user_123", "Project")).toThrow(
      "Unauthorized access to Project"
    );
  });
});

describe("computeNextReview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const DAY_MS = 24 * 60 * 60 * 1000;
  const baseTime = new Date("2024-01-15T12:00:00Z").getTime();

  it("returns 1 day interval for mastery level 1", () => {
    const nextReview = computeNextReview(1);
    expect(nextReview).toBe(baseTime + 1 * DAY_MS);
  });

  it("returns 3 days interval for mastery level 2", () => {
    const nextReview = computeNextReview(2);
    expect(nextReview).toBe(baseTime + 3 * DAY_MS);
  });

  it("returns 7 days interval for mastery level 3", () => {
    const nextReview = computeNextReview(3);
    expect(nextReview).toBe(baseTime + 7 * DAY_MS);
  });

  it("returns 14 days interval for mastery level 4", () => {
    const nextReview = computeNextReview(4);
    expect(nextReview).toBe(baseTime + 14 * DAY_MS);
  });

  it("returns 30 days interval for mastery level 5", () => {
    const nextReview = computeNextReview(5);
    expect(nextReview).toBe(baseTime + 30 * DAY_MS);
  });

  it("defaults to 1 day interval for unknown mastery levels", () => {
    const nextReview = computeNextReview(0);
    expect(nextReview).toBe(baseTime + 1 * DAY_MS);

    const nextReview6 = computeNextReview(6);
    expect(nextReview6).toBe(baseTime + 1 * DAY_MS);
  });
});

describe("now", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns current timestamp", () => {
    const timestamp = now();
    expect(timestamp).toBe(new Date("2024-01-15T12:00:00Z").getTime());
  });
});
