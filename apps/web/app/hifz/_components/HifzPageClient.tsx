"use client";

import { startTransition, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeft, ChevronRight, Loader2, ScrollText, Target } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
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
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
          <p className="text-sm font-medium tracking-wider uppercase">Building tracker…</p>
        </div>
      </div>
    );
  }

  if (!challenge || !weekView) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
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
    <div className="min-h-full bg-slate-950 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/60 text-slate-50 shadow-2xl backdrop-blur-md">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(16,185,129,0.08),transparent_40%,rgba(245,158,11,0.06))]" />
          <div className="absolute inset-y-0 right-0 hidden w-[500px] bg-[radial-gradient(circle_at_right,rgba(16,185,129,0.1),transparent_70%)] lg:block" />
          
          <div className="relative flex flex-col gap-8 p-8 md:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]">
                    <ScrollText className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                      {challenge.title}
                    </h1>
                    <p className="mt-1 text-sm font-medium uppercase tracking-[0.2em] text-emerald-400/80">
                      Quran Memorization Tracker
                    </p>
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-slate-400 md:text-base">
                  A single operational board for your 46-week memorization cycle. Log each day as it happened, keep the freeform page labels intact, and let the week view show where the challenge is holding or slipping.
                </p>
              </div>

              <div className="flex min-w-[320px] flex-col gap-4 rounded-2xl border border-slate-700/50 bg-slate-950/50 p-5 backdrop-blur-xl shadow-inner">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      Active Week
                    </p>
                    <p className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">
                        {getChallengeWeekNumber(weekView.weekStartDate)}
                      </span>
                      <span className="text-sm font-medium text-slate-500">
                        / {challenge.totalWeeks}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-right">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      Date Range
                    </p>
                    <p className="mt-1 font-mono text-sm font-medium text-slate-300">
                      {formatWeekRangeLabel(weekView.weekStartDate)}
                    </p>
                  </div>
                </div>
                
                <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                
                <div className="flex flex-wrap gap-2.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1.5 border px-3 py-1 font-mono text-xs shadow-sm",
                      weeklyTargetMet
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-300",
                    )}
                  >
                    <Target className="h-3.5 w-3.5" />
                    {weekView.totals.weekMemorizedPages}/{weekView.totals.targetPages} pages
                  </Badge>
                  <Badge variant="outline" className="border-slate-700 bg-slate-800/80 px-3 py-1 font-mono text-xs text-slate-300">
                    Rev {weekView.totals.weekRevisionPages}
                  </Badge>
                  <Badge variant="outline" className="border-slate-700 bg-slate-800/80 px-3 py-1 font-mono text-xs text-slate-300">
                    Total {challenge.overallMemorizedPages}/{challenge.totalTargetPages}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5 rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5 md:flex-row md:items-center md:justify-between backdrop-blur-md">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">
                    Expected Cadence
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Sun & Sat: Revision Focus. Mon-Fri: 5 pages new memorization.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => navigateWeek(-1)}
                  disabled={!canGoPrevious}
                  className="h-10 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:ring-slate-500"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Previous</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigateWeek(1)}
                  disabled={!canGoNext}
                  className="h-10 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:ring-slate-500"
                >
                  <span className="text-xs font-medium uppercase tracking-wider">Next</span>
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-900/40 p-5 shadow-2xl backdrop-blur-md md:p-6 lg:p-8">
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
