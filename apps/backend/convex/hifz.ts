import { v } from "convex/values";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthOrNull, now, requireAuth } from "./study/_helpers";

const CHALLENGE_TITLE = "46-Week Hifz Challenge";
const CHALLENGE_START_DATE = "2026-03-22";
const CHALLENGE_END_DATE = "2027-02-06";
const TOTAL_WEEKS = 46;
const PAGES_PER_WEEK = 5;
const TOTAL_TARGET_PAGES = 216;
const LAST_WEEK_START_DATE = shiftDate(CHALLENGE_END_DATE, -6);

const WEEKLY_TEMPLATE = {
  sun: "revision",
  mon: "memorization",
  tue: "memorization",
  wed: "memorization",
  thu: "memorization",
  fri: "memorization",
  sat: "revision",
} as const;

type HifzChallenge = Doc<"hifzChallenges">;
type HifzDayLog = Doc<"hifzDayLogs">;
type DayPlan = HifzChallenge["weeklyTemplate"][keyof HifzChallenge["weeklyTemplate"]];

function parseDateKey(dateKey: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error("Invalid date format");
  }

  const date = new Date(`${dateKey}T12:00:00.000Z`);
  if (formatDateKey(date) !== dateKey) {
    throw new Error("Invalid date");
  }

  return date;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftDate(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date);
}

function compareDateKeys(left: string, right: string): number {
  return left.localeCompare(right);
}

function normalizeWeekStart(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const dayOfWeek = date.getUTCDay();
  return shiftDate(dateKey, -dayOfWeek);
}

function clampWeekStart(dateKey: string): string {
  const normalized = normalizeWeekStart(dateKey);
  if (compareDateKeys(normalized, CHALLENGE_START_DATE) < 0) {
    return CHALLENGE_START_DATE;
  }
  if (compareDateKeys(normalized, LAST_WEEK_START_DATE) > 0) {
    return LAST_WEEK_START_DATE;
  }
  return normalized;
}

function getDayPlan(dateKey: string): DayPlan {
  const dayOfWeek = parseDateKey(dateKey).getUTCDay();
  if (dayOfWeek === 0) return WEEKLY_TEMPLATE.sun;
  if (dayOfWeek === 1) return WEEKLY_TEMPLATE.mon;
  if (dayOfWeek === 2) return WEEKLY_TEMPLATE.tue;
  if (dayOfWeek === 3) return WEEKLY_TEMPLATE.wed;
  if (dayOfWeek === 4) return WEEKLY_TEMPLATE.thu;
  if (dayOfWeek === 5) return WEEKLY_TEMPLATE.fri;
  return WEEKLY_TEMPLATE.sat;
}

function getWeekNumber(weekStartDate: string): number {
  const challengeStart = parseDateKey(CHALLENGE_START_DATE);
  const weekStart = parseDateKey(weekStartDate);
  const diffInDays = Math.round(
    (weekStart.getTime() - challengeStart.getTime()) / (24 * 60 * 60 * 1000),
  );
  return diffInDays / 7 + 1;
}

function getDefaultTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getVisualState(log: HifzDayLog | null, dateKey: string, todayDate: string) {
  if (log) {
    return log.entryState;
  }
  if (compareDateKeys(dateKey, todayDate) > 0) {
    return "upcoming" as const;
  }
  return "empty" as const;
}

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function validatePageCount(value: number, fieldName: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
}

function assertInChallengeRange(dateKey: string) {
  parseDateKey(dateKey);
  if (compareDateKeys(dateKey, CHALLENGE_START_DATE) < 0) {
    throw new Error("Date is outside the active challenge");
  }
  if (compareDateKeys(dateKey, CHALLENGE_END_DATE) > 0) {
    throw new Error("Date is outside the active challenge");
  }
}

function summarizeLogs(logs: HifzDayLog[]) {
  return logs.reduce(
    (totals, log) => {
      totals.memorized += log.memorizationPageCount;
      totals.revision += log.revisionPageCount;
      return totals;
    },
    { memorized: 0, revision: 0 },
  );
}

async function getActiveChallengeRecord(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<HifzChallenge | null> {
  return await ctx.db
    .query("hifzChallenges")
    .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "active"))
    .unique();
}

async function listChallengeLogs(
  ctx: QueryCtx | MutationCtx,
  challengeId: Id<"hifzChallenges">,
) {
  return await ctx.db
    .query("hifzDayLogs")
    .withIndex("by_challenge_date", (q) => q.eq("challengeId", challengeId))
    .collect();
}

function buildChallengeSummary(challenge: HifzChallenge, logs: HifzDayLog[]) {
  const totals = summarizeLogs(logs);

  return {
    ...challenge,
    overallMemorizedPages: totals.memorized,
    overallRevisionPages: totals.revision,
  };
}

export const ensureActiveChallenge = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const existing = await getActiveChallengeRecord(ctx, userId);
    if (existing) {
      return existing._id;
    }

    const timestamp = now();
    return await ctx.db.insert("hifzChallenges", {
      userId,
      title: CHALLENGE_TITLE,
      startDate: CHALLENGE_START_DATE,
      endDate: CHALLENGE_END_DATE,
      totalWeeks: TOTAL_WEEKS,
      pagesPerWeek: PAGES_PER_WEEK,
      totalTargetPages: TOTAL_TARGET_PAGES,
      status: "active",
      weeklyTemplate: WEEKLY_TEMPLATE,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const getActiveChallenge = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthOrNull(ctx);
    if (!userId) {
      return null;
    }

    const challenge = await getActiveChallengeRecord(ctx, userId);
    if (!challenge) {
      return null;
    }

    const logs = await listChallengeLogs(ctx, challenge._id);
    return buildChallengeSummary(challenge, logs);
  },
});

export const getWeekView = query({
  args: {
    weekStartDate: v.optional(v.string()),
    todayDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthOrNull(ctx);
    if (!userId) {
      return null;
    }

    const challenge = await getActiveChallengeRecord(ctx, userId);
    if (!challenge) {
      return null;
    }

    const requestedWeekStart = args.weekStartDate ?? CHALLENGE_START_DATE;
    const weekStartDate = clampWeekStart(requestedWeekStart);
    const weekEndDate = shiftDate(weekStartDate, 6);
    const todayDate = args.todayDate ?? getDefaultTodayDate();
    parseDateKey(todayDate);

    const logs = await listChallengeLogs(ctx, challenge._id);
    const logMap = new Map(logs.map((log) => [log.date, log]));
    const weekDates = Array.from({ length: 7 }, (_, index) => shiftDate(weekStartDate, index));
    const weekLogs = weekDates
      .map((date) => logMap.get(date))
      .filter((log): log is HifzDayLog => Boolean(log));
    const weekTotals = summarizeLogs(weekLogs);
    const overallTotals = summarizeLogs(logs);

    return {
      challenge: buildChallengeSummary(challenge, logs),
      weekStartDate,
      weekEndDate,
      weekNumber: getWeekNumber(weekStartDate),
      totals: {
        weekMemorizedPages: weekTotals.memorized,
        weekRevisionPages: weekTotals.revision,
        overallMemorizedPages: overallTotals.memorized,
        overallRevisionPages: overallTotals.revision,
        targetPages: challenge.pagesPerWeek,
        totalTargetPages: challenge.totalTargetPages,
      },
      days: weekDates.map((date) => {
        const log = logMap.get(date) ?? null;
        return {
          date,
          plannedDayType: getDayPlan(date),
          visualState: getVisualState(log, date, todayDate),
          memorizationPages: log?.memorizationPages,
          memorizationPageCount: log?.memorizationPageCount ?? 0,
          revisionPages: log?.revisionPages,
          revisionPageCount: log?.revisionPageCount ?? 0,
          note: log?.note,
          entryState: log?.entryState,
        };
      }),
    };
  },
});

export const upsertDayLog = mutation({
  args: {
    date: v.string(),
    memorizationPages: v.optional(v.string()),
    memorizationPageCount: v.number(),
    revisionPages: v.optional(v.string()),
    revisionPageCount: v.number(),
    note: v.optional(v.string()),
    entryState: v.union(
      v.literal("completed"),
      v.literal("partial"),
      v.literal("skipped"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const challenge = await getActiveChallengeRecord(ctx, userId);
    if (!challenge) {
      throw new Error("Active challenge not found");
    }

    assertInChallengeRange(args.date);
    validatePageCount(args.memorizationPageCount, "memorizationPageCount");
    validatePageCount(args.revisionPageCount, "revisionPageCount");

    const existing = await ctx.db
      .query("hifzDayLogs")
      .withIndex("by_challenge_date", (q) =>
        q.eq("challengeId", challenge._id).eq("date", args.date),
      )
      .unique();

    const timestamp = now();
    const patch = {
      memorizationPages: normalizeOptionalText(args.memorizationPages),
      memorizationPageCount: args.memorizationPageCount,
      revisionPages: normalizeOptionalText(args.revisionPages),
      revisionPageCount: args.revisionPageCount,
      note: normalizeOptionalText(args.note),
      entryState: args.entryState,
      updatedAt: timestamp,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("hifzDayLogs", {
      userId,
      challengeId: challenge._id,
      date: args.date,
      createdAt: timestamp,
      ...patch,
    });
  },
});

export const clearDayLog = mutation({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const challenge = await getActiveChallengeRecord(ctx, userId);
    if (!challenge) {
      throw new Error("Active challenge not found");
    }

    assertInChallengeRange(args.date);

    const existing = await ctx.db
      .query("hifzDayLogs")
      .withIndex("by_challenge_date", (q) =>
        q.eq("challengeId", challenge._id).eq("date", args.date),
      )
      .unique();

    if (!existing) {
      return null;
    }

    await ctx.db.delete(existing._id);
    return null;
  },
});
