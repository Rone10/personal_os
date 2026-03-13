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

function getStateBadge(day: HifzDay) {
  if (day.visualState === "completed") {
    return {
      label: "Completed",
      icon: CheckCircle2,
      className: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
    };
  }

  if (day.visualState === "partial") {
    return {
      label: "Partial",
      icon: Clock3,
      className: "text-amber-300 border-amber-500/30 bg-amber-500/10",
    };
  }

  if (day.visualState === "skipped") {
    return {
      label: "Skipped",
      icon: MinusCircle,
      className: "text-rose-300 border-rose-500/30 bg-rose-500/10",
    };
  }

  if (day.visualState === "upcoming") {
    return {
      label: "Upcoming",
      icon: RotateCcw,
      className: "text-slate-400 border-slate-600/30 bg-slate-800/40",
    };
  }

  return {
    label: "Open",
    icon: Edit3,
    className: "text-slate-200 border-slate-500/40 bg-slate-700/30",
  };
}

function getCardClasses(day: HifzDay) {
  if (day.visualState === "completed") {
    return "border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-slate-900/80 shadow-[0_8px_32px_-12px_rgba(16,185,129,0.2)] hover:border-emerald-500/50";
  }

  if (day.visualState === "partial") {
    return "border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-slate-900/80 shadow-[0_8px_32px_-12px_rgba(245,158,11,0.2)] hover:border-amber-500/50";
  }

  if (day.visualState === "skipped") {
    return "border-rose-500/30 bg-gradient-to-b from-rose-500/10 to-slate-900/80 shadow-[0_8px_32px_-12px_rgba(244,63,94,0.2)] hover:border-rose-500/50";
  }

  if (day.visualState === "upcoming") {
    return "border-slate-800 bg-gradient-to-b from-slate-800/40 to-slate-900/60 opacity-60 hover:opacity-100 hover:border-slate-700";
  }

  return "border-slate-700 bg-gradient-to-b from-slate-700/40 to-slate-900/80 hover:border-slate-500 shadow-sm";
}

export default function HifzWeekBoard({ weekView, onSelectDay }: HifzWeekBoardProps) {
  return (
    <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
      <div className="grid min-w-[1080px] grid-cols-7 gap-4">
        {weekView.days.map((day) => {
          const stateBadge = getStateBadge(day);
          const StateIcon = stateBadge.icon;
          const date = parseISO(day.date);
          const isCompleted = day.visualState === "completed";

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "group relative flex min-h-[340px] flex-col overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                getCardClasses(day),
              )}
            >
              <div
                className={cn(
                  "absolute inset-x-0 top-0 h-1 transition-opacity duration-300 group-hover:opacity-100",
                  day.plannedDayType === "memorization" ? "bg-emerald-500/60" : "bg-amber-500/60",
                  isCompleted ? "opacity-100" : "opacity-40"
                )}
              />

              <div className="mb-5 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium">
                    {format(date, "EEEE")}
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold tracking-tight text-slate-100">
                      {format(date, "d")}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                      {format(date, "MMM")}
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn("gap-1.5 border shadow-sm px-2 py-0.5", stateBadge.className)}
                >
                  <StateIcon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold tracking-wider uppercase">{stateBadge.label}</span>
                </Badge>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">New</span>
                  <span className="font-mono text-sm font-medium text-emerald-400">{day.memorizationPageCount}</span>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Rev</span>
                  <span className="font-mono text-sm font-medium text-amber-400">{day.revisionPageCount}</span>
                </div>
              </div>

              <div className="space-y-2.5 flex-1 w-full">
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 transition-colors group-hover:bg-slate-900/60">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium">Memorization</p>
                  </div>
                  <p className="line-clamp-2 text-sm text-slate-300 min-h-[2.5rem]">
                    {day.memorizationPages || <span className="text-slate-600 italic">No target logged</span>}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 transition-colors group-hover:bg-slate-900/60">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium">Revision</p>
                  </div>
                  <p className="line-clamp-2 text-sm text-slate-300 min-h-[2.5rem]">
                    {day.revisionPages || <span className="text-slate-600 italic">No targets logged</span>}
                  </p>
                </div>
              </div>

              {day.note && (
                <div className="mt-4 w-full">
                  <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 mb-1">Note</p>
                    <p className="line-clamp-2 text-xs text-slate-400 italic">
                      &quot;{day.note}&quot;
                    </p>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
