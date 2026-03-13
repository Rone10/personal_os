import {
  addWeeks,
  endOfWeek,
  format,
  isSameYear,
  parseISO,
  startOfWeek,
} from "date-fns";

export const HIFZ_CHALLENGE_TITLE = "46-Week Hifz Challenge";
export const HIFZ_CHALLENGE_START_DATE = "2026-03-22";
export const HIFZ_CHALLENGE_END_DATE = "2027-02-06";
export const HIFZ_TOTAL_WEEKS = 46;
export const HIFZ_PAGES_PER_WEEK = 5;
export const HIFZ_TOTAL_TARGET_PAGES = 216;
export const HIFZ_LAST_WEEK_START_DATE = "2027-01-31";

function parseDateKey(dateKey: string) {
  return parseISO(dateKey);
}

export function getLocalDateKey(date: Date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

export function normalizeWeekStartDate(dateKey: string) {
  return format(
    startOfWeek(parseDateKey(dateKey), { weekStartsOn: 0 }),
    "yyyy-MM-dd",
  );
}

export function clampWeekStartDate(dateKey: string) {
  const normalized = normalizeWeekStartDate(dateKey);
  if (normalized < HIFZ_CHALLENGE_START_DATE) {
    return HIFZ_CHALLENGE_START_DATE;
  }
  if (normalized > HIFZ_LAST_WEEK_START_DATE) {
    return HIFZ_LAST_WEEK_START_DATE;
  }
  return normalized;
}

export function getChallengeWeekNumber(weekStartDate: string) {
  const start = parseDateKey(HIFZ_CHALLENGE_START_DATE);
  const current = parseDateKey(clampWeekStartDate(weekStartDate));
  const diffInDays = Math.round(
    (current.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
  );
  return diffInDays / 7 + 1;
}

export function shiftWeekStartDate(weekStartDate: string, delta: number) {
  return clampWeekStartDate(
    format(addWeeks(parseDateKey(clampWeekStartDate(weekStartDate)), delta), "yyyy-MM-dd"),
  );
}

export function getDefaultWeekStartDate(today: Date = new Date()) {
  return clampWeekStartDate(getLocalDateKey(today));
}

export function formatWeekRangeLabel(weekStartDate: string) {
  const start = parseDateKey(clampWeekStartDate(weekStartDate));
  const end = endOfWeek(start, { weekStartsOn: 0 });

  if (isSameYear(start, end)) {
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
  }

  return `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
}
