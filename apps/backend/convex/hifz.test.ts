import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const hifzApi = (api as any).hifz;

describe("hifz", () => {
  afterEach(() => {
    // Restore timers for unrelated test files.
    vi.useRealTimers();
  });

  it("returns null for unauthenticated queries", async () => {
    const t = convexTest(schema, modules);

    const challenge = await t.query(hifzApi.getActiveChallenge, {});
    const weekView = await t.query(hifzApi.getWeekView, {
      weekStartDate: "2026-03-22",
      todayDate: "2026-03-25",
    });

    expect(challenge).toBeNull();
    expect(weekView).toBeNull();
  });

  it("throws when unauthenticated mutations run", async () => {
    const t = convexTest(schema, modules);

    await expect(t.mutation(hifzApi.ensureActiveChallenge, {})).rejects.toThrow(
      "Unauthorized",
    );
    await expect(
      t.mutation(hifzApi.upsertDayLog, {
        date: "2026-03-24",
        memorizationPages: "21-22",
        memorizationPageCount: 2,
        revisionPages: "18-20",
        revisionPageCount: 3,
        note: "Steady work",
        entryState: "completed",
      }),
    ).rejects.toThrow("Unauthorized");
    await expect(
      t.mutation(hifzApi.clearDayLog, { date: "2026-03-24" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("seeds one active challenge idempotently with the fixed schedule", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    const firstId = await asUser.mutation(hifzApi.ensureActiveChallenge, {});
    const secondId = await asUser.mutation(hifzApi.ensureActiveChallenge, {});
    const challenge = await asUser.query(hifzApi.getActiveChallenge, {});

    expect(firstId).toBe(secondId);
    expect(challenge).not.toBeNull();
    expect(challenge?.title).toBe("46-Week Hifz Challenge");
    expect(challenge?.startDate).toBe("2026-03-22");
    expect(challenge?.endDate).toBe("2027-02-06");
    expect(challenge?.totalWeeks).toBe(46);
    expect(challenge?.pagesPerWeek).toBe(5);
    expect(challenge?.totalTargetPages).toBe(216);
    expect(challenge?.status).toBe("active");
    expect(challenge?.weeklyTemplate).toEqual({
      sun: "revision",
      mon: "memorization",
      tue: "memorization",
      wed: "memorization",
      thu: "memorization",
      fri: "memorization",
      sat: "revision",
    });
    expect(challenge?.overallMemorizedPages).toBe(0);
    expect(challenge?.overallRevisionPages).toBe(0);
  });

  it("keeps challenge data isolated per user", async () => {
    const t = convexTest(schema, modules);
    const asUser1 = t.withIdentity({ subject: "user_1" });
    const asUser2 = t.withIdentity({ subject: "user_2" });

    await asUser1.mutation(hifzApi.ensureActiveChallenge, {});
    await asUser2.mutation(hifzApi.ensureActiveChallenge, {});

    await asUser1.mutation(hifzApi.upsertDayLog, {
      date: "2026-03-24",
      memorizationPages: "21-22",
      memorizationPageCount: 2,
      revisionPages: "18-20",
      revisionPageCount: 3,
      note: "User 1 log",
      entryState: "completed",
    });

    const user1Week = await asUser1.query(hifzApi.getWeekView, {
      weekStartDate: "2026-03-22",
      todayDate: "2026-03-25",
    });
    const user2Week = await asUser2.query(hifzApi.getWeekView, {
      weekStartDate: "2026-03-22",
      todayDate: "2026-03-25",
    });

    expect(user1Week?.totals.weekMemorizedPages).toBe(2);
    expect(
      user1Week?.days.find((day: any) => day.date === "2026-03-24")?.memorizationPages,
    ).toBe("21-22");

    expect(user2Week?.totals.weekMemorizedPages).toBe(0);
    expect(
      user2Week?.days.find((day: any) => day.date === "2026-03-24")?.memorizationPages,
    ).toBeUndefined();
  });

  it("returns a clamped sunday-based week view with derived day states", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    await asUser.mutation(hifzApi.ensureActiveChallenge, {});

    const weekView = await asUser.query(hifzApi.getWeekView, {
      weekStartDate: "2026-03-24",
      todayDate: "2026-03-25",
    });

    expect(weekView?.weekStartDate).toBe("2026-03-22");
    expect(weekView?.weekEndDate).toBe("2026-03-28");
    expect(weekView?.weekNumber).toBe(1);
    expect(weekView?.days).toHaveLength(7);
    expect(weekView?.days.map((day: any) => day.plannedDayType)).toEqual([
      "revision",
      "memorization",
      "memorization",
      "memorization",
      "memorization",
      "memorization",
      "revision",
    ]);
    expect(weekView?.days[0].visualState).toBe("empty");
    expect(weekView?.days[3].visualState).toBe("empty");
    expect(weekView?.days[4].visualState).toBe("upcoming");
    expect(weekView?.days[6].visualState).toBe("upcoming");
  });

  it("upserts one log per date and aggregates memorization separately from revision", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    await asUser.mutation(hifzApi.ensureActiveChallenge, {});

    await asUser.mutation(hifzApi.upsertDayLog, {
      date: "2026-03-24",
      memorizationPages: "21-22",
      memorizationPageCount: 2,
      revisionPages: "18-20",
      revisionPageCount: 3,
      note: "Initial entry",
      entryState: "completed",
    });
    await asUser.mutation(hifzApi.upsertDayLog, {
      date: "2026-03-24",
      memorizationPages: "21-23",
      memorizationPageCount: 3,
      revisionPages: "18-19",
      revisionPageCount: 2,
      note: "Updated entry",
      entryState: "partial",
    });
    await asUser.mutation(hifzApi.upsertDayLog, {
      date: "2026-03-26",
      memorizationPages: "24-25",
      memorizationPageCount: 2,
      revisionPages: undefined,
      revisionPageCount: 0,
      note: "Second session",
      entryState: "completed",
    });

    const weekView = await asUser.query(hifzApi.getWeekView, {
      weekStartDate: "2026-03-22",
      todayDate: "2026-03-26",
    });
    const challenge = await asUser.query(hifzApi.getActiveChallenge, {});

    const tuesday = weekView?.days.find((day: any) => day.date === "2026-03-24");
    expect(tuesday?.memorizationPages).toBe("21-23");
    expect(tuesday?.memorizationPageCount).toBe(3);
    expect(tuesday?.revisionPages).toBe("18-19");
    expect(tuesday?.revisionPageCount).toBe(2);
    expect(tuesday?.note).toBe("Updated entry");
    expect(tuesday?.visualState).toBe("partial");

    expect(weekView?.totals.weekMemorizedPages).toBe(5);
    expect(weekView?.totals.weekRevisionPages).toBe(2);
    expect(weekView?.totals.targetPages).toBe(5);
    expect(weekView?.totals.overallMemorizedPages).toBe(5);
    expect(challenge?.overallMemorizedPages).toBe(5);
    expect(challenge?.overallRevisionPages).toBe(2);
  });

  it("clears an existing day log", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    await asUser.mutation(hifzApi.ensureActiveChallenge, {});
    await asUser.mutation(hifzApi.upsertDayLog, {
      date: "2026-03-24",
      memorizationPages: "21-22",
      memorizationPageCount: 2,
      revisionPages: "18-20",
      revisionPageCount: 3,
      note: "To be cleared",
      entryState: "completed",
    });

    await asUser.mutation(hifzApi.clearDayLog, { date: "2026-03-24" });

    const weekView = await asUser.query(hifzApi.getWeekView, {
      weekStartDate: "2026-03-22",
      todayDate: "2026-03-25",
    });
    const clearedDay = weekView?.days.find((day: any) => day.date === "2026-03-24");

    expect(clearedDay?.memorizationPages).toBeUndefined();
    expect(clearedDay?.revisionPages).toBeUndefined();
    expect(clearedDay?.note).toBeUndefined();
    expect(clearedDay?.visualState).toBe("empty");
    expect(weekView?.totals.weekMemorizedPages).toBe(0);
  });

  it("clamps requested weeks to the challenge bounds", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    await asUser.mutation(hifzApi.ensureActiveChallenge, {});

    const beforeStart = await asUser.query(hifzApi.getWeekView, {
      weekStartDate: "2026-03-01",
      todayDate: "2026-03-25",
    });
    const afterEnd = await asUser.query(hifzApi.getWeekView, {
      weekStartDate: "2027-02-20",
      todayDate: "2027-02-20",
    });

    expect(beforeStart?.weekStartDate).toBe("2026-03-22");
    expect(beforeStart?.weekNumber).toBe(1);
    expect(afterEnd?.weekStartDate).toBe("2027-01-31");
    expect(afterEnd?.weekEndDate).toBe("2027-02-06");
    expect(afterEnd?.weekNumber).toBe(46);
  });
});
