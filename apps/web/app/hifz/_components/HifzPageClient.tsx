"use client";

import { startTransition, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeft, ChevronRight, Loader2, BookOpen, Target } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import HifzDaySheet from "./HifzDaySheet";
import HifzWeekBoard, { type HifzWeekView } from "./HifzWeekBoard";
import {
  HIFZ_CHALLENGE_START_DATE,
  HIFZ_LAST_WEEK_START_DATE,
  clampWeekStartDate,
  formatWeekRangeLabel,
  getChallengeWeekNumber,
  getDefaultWeekStartDate,
  getLocalDateKey,
  shiftWeekStartDate,
} from "../_lib/week";

export default function HifzPageClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ensureActiveChallenge = useMutation(api.hifz.ensureActiveChallenge);
  const upsertDayLog = useMutation(api.hifz.upsertDayLog);
  const clearDayLog = useMutation(api.hifz.clearDayLog);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const requestedWeek = searchParams.get("week");
  const selectedWeekStart = clampWeekStartDate(requestedWeek ?? getDefaultWeekStartDate());
  const todayDate = getLocalDateKey();
  const challenge = useQuery(api.hifz.getActiveChallenge, {});
  const weekView = useQuery(api.hifz.getWeekView, {
    weekStartDate: selectedWeekStart,
    todayDate,
  }) as HifzWeekView | null | undefined;

  useEffect(() => {
    void ensureActiveChallenge({});
  }, [ensureActiveChallenge]);

  useEffect(() => {
    if (requestedWeek === selectedWeekStart) {
      return;
    }

    startTransition(() => {
      router.replace(`${pathname}?week=${selectedWeekStart}`, { scroll: false });
    });
  }, [pathname, requestedWeek, router, selectedWeekStart]);

  useEffect(() => {
    if (!weekView || !selectedDate) {
      return;
    }

    if (!weekView.days.some((day) => day.date === selectedDate)) {
      setSelectedDate(null);
      setSheetOpen(false);
    }
  }, [selectedDate, weekView]);

  if (challenge === undefined || weekView === undefined) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#9CA3AF]">
          <Loader2 className="h-7 w-7 animate-spin text-[#4ADE80]" />
          <p className="text-sm font-medium tracking-wider uppercase">Building tracker…</p>
        </div>
      </div>
    );
  }

  if (!challenge || !weekView) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#9CA3AF]">
          <Loader2 className="h-7 w-7 animate-spin text-[#4ADE80]" />
          <p className="text-sm font-medium tracking-wider uppercase">Initializing challenge…</p>
        </div>
      </div>
    );
  }

  const selectedDay = weekView.days.find((day) => day.date === selectedDate) ?? null;
  const currentWeekStart = weekView.weekStartDate;
  const canGoPrevious = weekView.weekStartDate !== HIFZ_CHALLENGE_START_DATE;
  const canGoNext = weekView.weekStartDate !== HIFZ_LAST_WEEK_START_DATE;
  const weeklyTargetMet = weekView.totals.weekMemorizedPages >= weekView.totals.targetPages;

  function navigateWeek(delta: number) {
    const nextWeek = shiftWeekStartDate(currentWeekStart, delta);
    setSelectedDate(null);
    setSheetOpen(false);
    startTransition(() => {
      router.replace(`${pathname}?week=${nextWeek}`, { scroll: false });
    });
  }

  return (
    <div className="min-h-full bg-slate-50 font-sans text-slate-900 selection:bg-emerald-200 selection:text-emerald-950 dark:bg-slate-50 dark:text-slate-900">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <section className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.28)] md:p-10">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(16,185,129,0.08),transparent_38%,rgba(245,158,11,0.06))]" />
          <div className="absolute inset-y-0 right-0 hidden w-[500px] bg-[radial-gradient(circle_at_right,rgba(16,185,129,0.1),transparent_70%)] lg:block" />

          <div className="relative flex flex-col gap-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[12px] border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-[0_18px_40px_-28px_rgba(16,185,129,0.45)]">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="font-serif text-[32px] leading-tight font-bold tracking-tight text-slate-950 md:text-[36px]">
                      {challenge.title}
                    </h1>
                    <p className="mt-1 font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                      Quran Memorization Tracker
                    </p>
                  </div>
                </div>

                <p className="font-sans text-[14px] leading-[1.6] text-slate-600 md:text-[15px]">
                  A single operational board for your 46-week memorization cycle. Log each day as it happened, keep the freeform page labels intact, and let the week view show where the challenge is holding or slipping.
                </p>
              </div>

              <div className="flex min-w-[320px] flex-col gap-4 rounded-[12px] border border-slate-200 bg-slate-50 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Active Week
                    </p>
                    <p className="mt-1 flex items-baseline gap-2">
                      <span className="font-mono text-[28px] font-bold text-slate-950 tabular-nums leading-none">
                        {getChallengeWeekNumber(weekView.weekStartDate)}
                      </span>
                      <span className="font-mono text-[14px] font-medium text-slate-400">
                        / {challenge.totalWeeks}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-right">
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Date Range
                    </p>
                    <p className="mt-1 font-mono text-[13px] font-medium text-slate-900">
                      {formatWeekRangeLabel(weekView.weekStartDate)}
                    </p>
                  </div>
                </div>
                
                <div className="w-full">
                  <div className="relative h-[3px] w-full bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-all duration-500 ease-out" 
                      style={{ width: `${(getChallengeWeekNumber(weekView.weekStartDate) / challenge.totalWeeks) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2.5">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] shadow-sm font-semibold",
                      weeklyTargetMet
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700",
                    )}
                  >
                    <Target className="h-3.5 w-3.5" />
                    {weekView.totals.weekMemorizedPages}/{weekView.totals.targetPages} pg
                  </div>
                  <div className="flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-[11px] text-slate-700 font-medium">
                    Rev {weekView.totals.weekRevisionPages}
                  </div>
                  <div className="flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-[11px] text-slate-700 font-medium">
                    Total {challenge.overallMemorizedPages}/{challenge.totalTargetPages}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5 rounded-[12px] border border-emerald-200 bg-emerald-50/60 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.45)]" />
                <div>
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-900">
                    Expected Cadence
                  </p>
                  <p className="mt-1 font-sans text-[13px] text-slate-600">
                    <strong className="font-semibold text-amber-700 uppercase text-[11px] tracking-wider">Sun & Sat</strong> Revision Focus. <strong className="font-semibold text-emerald-700 uppercase text-[11px] tracking-wider ml-1">Mon-Fri</strong> 5 pages new memorization.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => navigateWeek(-1)}
                  disabled={!canGoPrevious}
                  className="h-10 rounded-[8px] border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 disabled:opacity-50 disabled:hover:bg-white"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em]">Previous</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigateWeek(1)}
                  disabled={!canGoNext}
                  className="h-10 rounded-[8px] border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 disabled:opacity-50 disabled:hover:bg-white"
                >
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em]">Next</span>
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.28)] lg:p-8">
          <HifzWeekBoard
            weekView={weekView}
            onSelectDay={(day) => {
              setSelectedDate(day.date);
              setSheetOpen(true);
            }}
          />
        </section>
      </div>

      <HifzDaySheet
        day={selectedDay}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSave={async (values) => {
          setIsSaving(true);
          try {
            await upsertDayLog(values);
            setSheetOpen(false);
          } finally {
            setIsSaving(false);
          }
        }}
        onClear={async (date) => {
          setIsSaving(true);
          try {
            await clearDayLog({ date });
            setSheetOpen(false);
          } finally {
            setIsSaving(false);
          }
        }}
        isSaving={isSaving}
      />
    </div>
  );
}
