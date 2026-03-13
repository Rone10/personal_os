import { describe, expect, it, vi } from "vitest";
import {
  clampWeekStartDate,
  formatWeekRangeLabel,
  getChallengeWeekNumber,
  getDefaultWeekStartDate,
  getLocalDateKey,
  normalizeWeekStartDate,
  shiftWeekStartDate,
} from "./week";

describe("normalizeWeekStartDate", () => {
  it("normalizes any day in the week back to Sunday", () => {
    expect(normalizeWeekStartDate("2026-03-22")).toBe("2026-03-22");
    expect(normalizeWeekStartDate("2026-03-24")).toBe("2026-03-22");
    expect(normalizeWeekStartDate("2026-03-28")).toBe("2026-03-22");
  });
});

describe("clampWeekStartDate", () => {
  it("clamps dates before the challenge to week 1", () => {
    expect(clampWeekStartDate("2026-03-01")).toBe("2026-03-22");
  });

  it("clamps dates after the challenge to the final week", () => {
    expect(clampWeekStartDate("2027-02-20")).toBe("2027-01-31");
  });
});

describe("getChallengeWeekNumber", () => {
  it("returns the 1-based week number inside the challenge", () => {
    expect(getChallengeWeekNumber("2026-03-22")).toBe(1);
    expect(getChallengeWeekNumber("2026-03-29")).toBe(2);
    expect(getChallengeWeekNumber("2027-01-31")).toBe(46);
  });
});

describe("shiftWeekStartDate", () => {
  it("moves by full sunday-based weeks and remains clamped", () => {
    expect(shiftWeekStartDate("2026-03-22", 1)).toBe("2026-03-29");
    expect(shiftWeekStartDate("2026-03-22", -1)).toBe("2026-03-22");
    expect(shiftWeekStartDate("2027-01-31", 1)).toBe("2027-01-31");
  });
});

describe("getLocalDateKey", () => {
  it("formats dates in local time without timezone drift", () => {
    const date = new Date(2026, 2, 22, 9, 30);
    expect(getLocalDateKey(date)).toBe("2026-03-22");
  });
});

describe("getDefaultWeekStartDate", () => {
  it("uses the current local date and clamps it into the challenge", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 13, 9, 30));
    expect(getDefaultWeekStartDate()).toBe("2026-03-22");

    vi.setSystemTime(new Date(2026, 2, 26, 9, 30));
    expect(getDefaultWeekStartDate()).toBe("2026-03-22");

    vi.setSystemTime(new Date(2027, 1, 15, 9, 30));
    expect(getDefaultWeekStartDate()).toBe("2027-01-31");
    vi.useRealTimers();
  });
});

describe("formatWeekRangeLabel", () => {
  it("returns a concise human-readable week range", () => {
    expect(formatWeekRangeLabel("2026-03-22")).toBe("Mar 22 - Mar 28, 2026");
    expect(formatWeekRangeLabel("2026-12-27")).toBe("Dec 27, 2026 - Jan 2, 2027");
  });
});
