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
          <p className="text-sm">Building your hifz board…</p>
        </div>
      </div>
    );
  }

  if (!challenge || !weekView) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
          <p className="text-sm">Initializing your memorization challenge…</p>
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
    <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.1),transparent_22%),linear-gradient(180deg,rgba(2,6,23,0.04),transparent_25%)]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 text-slate-50 shadow-[0_40px_120px_-48px_rgba(15,118,110,0.9)]">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(16,185,129,0.16),transparent_40%,rgba(245,158,11,0.12))]" />
          <div className="absolute inset-y-0 right-0 hidden w-80 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.22),transparent_65%)] md:block" />

          <div className="relative flex flex-col gap-8 p-6 md:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                    <ScrollText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-quran text-3xl leading-none text-emerald-200">حفظ</p>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                      Quran Memorization Tracker
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                    {challenge.title}
                  </h1>
                  <p className="max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
                    A single operational board for your 46-week memorization cycle. Log each
                    day as it happened, keep the freeform page labels intact, and let the week
                    view show where the challenge is holding or slipping.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">
                      Active Week
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      Week {getChallengeWeekNumber(weekView.weekStartDate)} of{" "}
                      {challenge.totalWeeks}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
                    <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">
                      Range
                    </p>
                    <p className="mt-1 text-sm text-slate-200">
                      {formatWeekRangeLabel(weekView.weekStartDate)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "border font-mono",
                      weeklyTargetMet
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                        : "border-amber-400/30 bg-amber-500/10 text-amber-100",
                    )}
                  >
                    <Target className="h-3.5 w-3.5" />
                    {weekView.totals.weekMemorizedPages}/{weekView.totals.targetPages} pages
                  </Badge>
                  <Badge variant="outline" className="border-slate-500/30 bg-slate-500/10">
                    Revision {weekView.totals.weekRevisionPages}
                  </Badge>
                  <Badge variant="outline" className="border-slate-500/30 bg-slate-500/10">
                    Overall {challenge.overallMemorizedPages}/{challenge.totalTargetPages}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  Sunday to Saturday cadence
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Sunday and Saturday are revision-planned by default. Monday through Friday
                  carry the five-page memorization target.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigateWeek(-1)}
                  disabled={!canGoPrevious}
                  className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigateWeek(1)}
                  disabled={!canGoNext}
                  className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(248,250,252,0.96))] p-4 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.92))] md:p-5">
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
