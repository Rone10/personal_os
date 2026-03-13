"use client";

import { format, parseISO } from "date-fns";
import { CheckCircle2, Clock3, Edit3, MinusCircle, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type HifzDay = {
  date: string;
  plannedDayType: "memorization" | "revision";
  visualState: "completed" | "partial" | "skipped" | "empty" | "upcoming";
  memorizationPages?: string;
  memorizationPageCount: number;
  revisionPages?: string;
  revisionPageCount: number;
  note?: string;
  entryState?: "completed" | "partial" | "skipped";
};

export type HifzWeekView = {
  challenge: {
    title: string;
    totalWeeks: number;
    pagesPerWeek: number;
    totalTargetPages: number;
    overallMemorizedPages: number;
    overallRevisionPages: number;
  };
  weekStartDate: string;
  weekEndDate: string;
  weekNumber: number;
  totals: {
    weekMemorizedPages: number;
    weekRevisionPages: number;
    overallMemorizedPages: number;
    overallRevisionPages: number;
    targetPages: number;
    totalTargetPages: number;
  };
  days: HifzDay[];
};

type HifzWeekBoardProps = {
  weekView: HifzWeekView;
  onSelectDay: (day: HifzDay) => void;
};

function getPlanClasses(plan: HifzDay["plannedDayType"]) {
  return plan === "memorization"
    ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
    : "text-amber-300 border-amber-500/30 bg-amber-500/10";
}

function getStateBadge(day: HifzDay) {
  if (day.visualState === "completed") {
    return {
      label: "Completed",
      icon: CheckCircle2,
      className: "text-emerald-200 border-emerald-400/30 bg-emerald-500/15",
    };
  }

  if (day.visualState === "partial") {
    return {
      label: "Partial",
      icon: Clock3,
      className: "text-amber-100 border-amber-400/30 bg-amber-500/15",
    };
  }

  if (day.visualState === "skipped") {
    return {
      label: "Skipped",
      icon: MinusCircle,
      className: "text-rose-100 border-rose-400/30 bg-rose-500/15",
    };
  }

  if (day.visualState === "upcoming") {
    return {
      label: "Upcoming",
      icon: RotateCcw,
      className: "text-slate-300 border-slate-500/30 bg-slate-500/10",
    };
  }

  return {
    label: "Open",
    icon: Edit3,
    className: "text-slate-200 border-slate-400/25 bg-white/5",
  };
}

function getCardClasses(day: HifzDay) {
  if (day.visualState === "completed") {
    return "border-emerald-500/30 bg-[linear-gradient(180deg,rgba(16,185,129,0.15),rgba(15,23,42,0.82))] shadow-[0_24px_50px_-34px_rgba(16,185,129,0.95)]";
  }

  if (day.visualState === "partial") {
    return "border-amber-500/30 bg-[linear-gradient(180deg,rgba(245,158,11,0.14),rgba(15,23,42,0.82))] shadow-[0_24px_50px_-34px_rgba(245,158,11,0.85)]";
  }

  if (day.visualState === "skipped") {
    return "border-rose-500/25 bg-[linear-gradient(180deg,rgba(244,63,94,0.12),rgba(15,23,42,0.8))] opacity-90";
  }

  if (day.visualState === "upcoming") {
    return "border-slate-700/80 bg-[linear-gradient(180deg,rgba(51,65,85,0.38),rgba(15,23,42,0.88))] text-slate-300";
  }

  return "border-slate-700/80 bg-[linear-gradient(180deg,rgba(30,41,59,0.55),rgba(15,23,42,0.88))]";
}

export default function HifzWeekBoard({ weekView, onSelectDay }: HifzWeekBoardProps) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[960px] grid-cols-7 gap-3">
        {weekView.days.map((day) => {
          const stateBadge = getStateBadge(day);
          const StateIcon = stateBadge.icon;
          const date = parseISO(day.date);

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "group relative flex min-h-[320px] flex-col overflow-hidden rounded-[1.6rem] border p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60",
                getCardClasses(day),
              )}
            >
              <div
                className={cn(
                  "absolute inset-x-0 top-0 h-1.5",
                  day.plannedDayType === "memorization" ? "bg-emerald-400/80" : "bg-amber-400/80",
                )}
              />

              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
                    {format(date, "EEEE")}
                  </p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-3xl font-semibold tracking-tight text-white">
                      {format(date, "d")}
                    </span>
                    <span className="pb-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                      {format(date, "MMM")}
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn("gap-1.5 border", stateBadge.className)}
                >
                  <StateIcon className="h-3 w-3" />
                  {stateBadge.label}
                </Badge>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={cn("border font-medium tracking-wide", getPlanClasses(day.plannedDayType))}
                >
                  {day.plannedDayType === "memorization" ? "Memorization" : "Revision"}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-slate-600/80 bg-slate-900/70 font-mono text-slate-200"
                >
                  {day.memorizationPageCount} / {day.revisionPageCount}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">New</p>
                  <p className="mt-2 min-h-10 text-sm leading-relaxed text-slate-100">
                    {day.memorizationPages || "No memorization pages logged"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Review</p>
                  <p className="mt-2 min-h-10 text-sm leading-relaxed text-slate-100">
                    {day.revisionPages || "No revision pages logged"}
                  </p>
                </div>
              </div>

              <div className="mt-auto pt-4">
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Note</p>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-300">
                    {day.note || "Add an observation, weak spot, or revision reminder."}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
