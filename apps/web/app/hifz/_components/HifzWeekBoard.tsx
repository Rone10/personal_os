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
      className: "text-emerald-200 border-emerald-500/30 bg-emerald-500/12",
    };
  }

  if (day.visualState === "partial") {
    return {
      label: "Partial",
      icon: Clock3,
      className: "text-amber-100 border-amber-500/30 bg-amber-500/12",
    };
  }

  if (day.visualState === "skipped") {
    return {
      label: "Skipped",
      icon: MinusCircle,
      className: "text-rose-100 border-rose-500/30 bg-rose-500/12",
    };
  }

  if (day.visualState === "upcoming") {
    return {
      label: "Upcoming",
      icon: RotateCcw,
      className: "text-slate-300 border-slate-600/30 bg-slate-700/30",
    };
  }

  return {
    label: "Open",
    icon: Edit3,
    className: "text-slate-100 border-slate-500/30 bg-slate-700/25",
  };
}

function getHeaderClasses(day: HifzDay) {
  if (day.visualState === "completed") {
    return "bg-[linear-gradient(180deg,rgba(16,185,129,0.16),rgba(15,23,42,0.96))] border-emerald-500/25";
  }

  if (day.visualState === "partial") {
    return "bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(15,23,42,0.96))] border-amber-500/25";
  }

  if (day.visualState === "skipped") {
    return "bg-[linear-gradient(180deg,rgba(244,63,94,0.14),rgba(15,23,42,0.96))] border-rose-500/25";
  }

  if (day.visualState === "upcoming") {
    return "bg-[linear-gradient(180deg,rgba(51,65,85,0.55),rgba(15,23,42,0.96))] border-slate-700/80";
  }

  return "bg-[linear-gradient(180deg,rgba(30,41,59,0.62),rgba(15,23,42,0.96))] border-slate-700/80";
}

function getDetailCellClasses(day: HifzDay) {
  if (day.visualState === "completed") {
    return "bg-emerald-500/[0.06]";
  }

  if (day.visualState === "partial") {
    return "bg-amber-500/[0.06]";
  }

  if (day.visualState === "skipped") {
    return "bg-rose-500/[0.06]";
  }

  if (day.visualState === "upcoming") {
    return "bg-slate-900/55 text-slate-400";
  }

  return "bg-slate-950/55";
}

function renderCellButton(
  day: HifzDay,
  onSelectDay: (day: HifzDay) => void,
  content: React.ReactNode,
  className?: string,
) {
  return (
    <button
      type="button"
      onClick={() => onSelectDay(day)}
      className={cn(
        "block h-full w-full p-3 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60",
        className,
      )}
    >
      {content}
    </button>
  );
}

export default function HifzWeekBoard({ weekView, onSelectDay }: HifzWeekBoardProps) {
  return (
    <div className="overflow-x-auto pb-3">
      <div className="min-w-[1180px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.95)]">
        <table className="w-full table-fixed border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-28 border-b border-r border-white/10 bg-slate-950 px-4 py-4 text-left align-top">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Week</p>
                <p className="mt-2 font-mono text-3xl font-semibold text-white">
                  {weekView.weekNumber}
                </p>
              </th>
              {weekView.days.map((day) => {
                const date = parseISO(day.date);
                const stateBadge = getStateBadge(day);
                const StateIcon = stateBadge.icon;

                return (
                  <th
                    key={day.date}
                    className={cn(
                      "border-b border-l border-white/10 align-top",
                      getHeaderClasses(day),
                    )}
                  >
                    {renderCellButton(
                      day,
                      onSelectDay,
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.26em] text-slate-400">
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
                            className={cn("gap-1.5 border px-2 py-0.5", stateBadge.className)}
                          >
                            <StateIcon className="h-3 w-3" />
                            {stateBadge.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                              New
                            </p>
                            <p className="mt-1 font-mono text-base text-emerald-300">
                              {day.memorizationPageCount}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                              Rev
                            </p>
                            <p className="mt-1 font-mono text-base text-amber-300">
                              {day.revisionPageCount}
                            </p>
                          </div>
                        </div>
                      </div>,
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            <tr>
              <th className="sticky left-0 z-10 border-r border-b border-white/10 bg-slate-950 px-4 py-3 text-left align-top">
                <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Plan</p>
              </th>
              {weekView.days.map((day) => (
                <td
                  key={`${day.date}-plan`}
                  className={cn("border-l border-b border-white/10 align-top", getDetailCellClasses(day))}
                >
                  {renderCellButton(
                    day,
                    onSelectDay,
                    <Badge
                      variant="outline"
                      className={cn(
                        "border font-medium",
                        day.plannedDayType === "memorization"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-100",
                      )}
                    >
                      {day.plannedDayType === "memorization" ? "Memorization" : "Revision"}
                    </Badge>,
                    "min-h-[78px]",
                  )}
                </td>
              ))}
            </tr>

            <tr>
              <th className="sticky left-0 z-10 border-r border-b border-white/10 bg-slate-950 px-4 py-3 text-left align-top">
                <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">State</p>
              </th>
              {weekView.days.map((day) => {
                const stateBadge = getStateBadge(day);
                const StateIcon = stateBadge.icon;

                return (
                  <td
                    key={`${day.date}-state`}
                    className={cn("border-l border-b border-white/10 align-top", getDetailCellClasses(day))}
                  >
                    {renderCellButton(
                      day,
                      onSelectDay,
                      <div className="space-y-3">
                        <Badge
                          variant="outline"
                          className={cn("gap-1.5 border px-2 py-0.5", stateBadge.className)}
                        >
                          <StateIcon className="h-3 w-3" />
                          {stateBadge.label}
                        </Badge>
                        <p className="font-mono text-xs text-slate-400">
                          {day.memorizationPageCount} new / {day.revisionPageCount} review
                        </p>
                      </div>,
                      "min-h-[96px]",
                    )}
                  </td>
                );
              })}
            </tr>

            <tr>
              <th className="sticky left-0 z-10 border-r border-b border-white/10 bg-slate-950 px-4 py-3 text-left align-top">
                <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Memorization</p>
              </th>
              {weekView.days.map((day) => (
                <td
                  key={`${day.date}-memorization`}
                  className={cn("border-l border-b border-white/10 align-top", getDetailCellClasses(day))}
                >
                  {renderCellButton(
                    day,
                    onSelectDay,
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Pages</p>
                      <p className="line-clamp-3 text-sm leading-relaxed text-slate-100">
                        {day.memorizationPages || "No memorization pages logged"}
                      </p>
                    </div>,
                    "min-h-[118px]",
                  )}
                </td>
              ))}
            </tr>

            <tr>
              <th className="sticky left-0 z-10 border-r border-b border-white/10 bg-slate-950 px-4 py-3 text-left align-top">
                <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Revision</p>
              </th>
              {weekView.days.map((day) => (
                <td
                  key={`${day.date}-revision`}
                  className={cn("border-l border-b border-white/10 align-top", getDetailCellClasses(day))}
                >
                  {renderCellButton(
                    day,
                    onSelectDay,
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Pages</p>
                      <p className="line-clamp-3 text-sm leading-relaxed text-slate-100">
                        {day.revisionPages || "No revision pages logged"}
                      </p>
                    </div>,
                    "min-h-[118px]",
                  )}
                </td>
              ))}
            </tr>

            <tr>
              <th className="sticky left-0 z-10 border-r bg-slate-950 px-4 py-3 text-left align-top">
                <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Note</p>
              </th>
              {weekView.days.map((day) => (
                <td
                  key={`${day.date}-note`}
                  className={cn("border-l border-white/10 align-top", getDetailCellClasses(day))}
                >
                  {renderCellButton(
                    day,
                    onSelectDay,
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Reflection</p>
                      <p className="line-clamp-4 text-sm leading-relaxed text-slate-300">
                        {day.note || "Add a weakness, breakthrough, or revision reminder."}
                      </p>
                    </div>,
                    "min-h-[134px]",
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
