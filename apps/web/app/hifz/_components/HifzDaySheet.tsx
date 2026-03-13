"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { BookOpen, BookOpenCheck, Edit3, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { HifzDay } from "./HifzWeekBoard";

type EntryState = "completed" | "partial" | "skipped";

type HifzDaySheetProps = {
  day: HifzDay | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: {
    date: string;
    memorizationPages?: string;
    memorizationPageCount: number;
    revisionPages?: string;
    revisionPageCount: number;
    note?: string;
    entryState: EntryState;
  }) => Promise<void>;
  onClear: (date: string) => Promise<void>;
  isSaving: boolean;
};

function getInitialState(day: HifzDay | null): EntryState {
  if (day?.entryState) {
    return day.entryState;
  }
  return "completed";
}

export default function HifzDaySheet({
  day,
  open,
  onOpenChange,
  onSave,
  onClear,
  isSaving,
}: HifzDaySheetProps) {
  const isMobile = useIsMobile();
  const [memorizationPages, setMemorizationPages] = useState("");
  const [memorizationPageCount, setMemorizationPageCount] = useState(0);
  const [revisionPages, setRevisionPages] = useState("");
  const [revisionPageCount, setRevisionPageCount] = useState(0);
  const [note, setNote] = useState("");
  const [entryState, setEntryState] = useState<EntryState>("completed");

  useEffect(() => {
    if (!day) {
      return;
    }

    setMemorizationPages(day.memorizationPages ?? "");
    setMemorizationPageCount(day.memorizationPageCount);
    setRevisionPages(day.revisionPages ?? "");
    setRevisionPageCount(day.revisionPageCount);
    setNote(day.note ?? "");
    setEntryState(getInitialState(day));
  }, [day]);

  if (!day) {
    return null;
  }

  const hasExistingLog = Boolean(day.entryState);
  const formattedDate = format(parseISO(day.date), "EEEE, MMMM d, yyyy");
  const Container = isMobile ? Drawer : Sheet;
  const Content = isMobile ? DrawerContent : SheetContent;
  const Header = isMobile ? DrawerHeader : SheetHeader;
  const Title = isMobile ? DrawerTitle : SheetTitle;
  const Description = isMobile ? DrawerDescription : SheetDescription;
  const Footer = isMobile ? DrawerFooter : SheetFooter;

  const content = (
    <>
      <Header className="gap-4 border-b border-white/5 bg-slate-950/40 pb-6 pt-8 px-6 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge
            variant="outline"
            className={cn(
              "border font-semibold tracking-wider text-[11px] uppercase shadow-sm px-2.5 py-0.5",
              day.plannedDayType === "memorization"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-400",
            )}
          >
            {day.plannedDayType === "memorization" ? "Memorization Day" : "Revision Day"}
          </Badge>
          <Badge variant="outline" className="border-slate-700 bg-slate-800/80 text-slate-300 font-semibold tracking-wider text-[11px] uppercase px-2.5 py-0.5">
            {day.visualState}
          </Badge>
        </div>
        <div className="space-y-1.5 mt-1">
          <Title className="text-2xl font-bold tracking-tight text-slate-100">{formattedDate}</Title>
          <Description className="text-slate-400 text-sm leading-relaxed">
            Freeform page labels stay exactly as typed. Numeric counts drive the weekly and challenge progress totals.
          </Description>
        </div>
      </Header>

      <form
        className="flex flex-1 flex-col overflow-y-auto bg-slate-950"
        onSubmit={async (event) => {
          event.preventDefault();
          await onSave({
            date: day.date,
            memorizationPages: memorizationPages.trim() || undefined,
            memorizationPageCount,
            revisionPages: revisionPages.trim() || undefined,
            revisionPageCount,
            note: note.trim() || undefined,
            entryState,
          });
        }}
      >
        <div className="flex-1 space-y-8 p-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
                <BookOpen className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-slate-200">Memorization</h3>
            </div>
            <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
              <div className="space-y-2">
                <Label htmlFor="memorization-pages" className="text-xs uppercase tracking-wider text-slate-500">Pages/Sections</Label>
                <Input
                  id="memorization-pages"
                  value={memorizationPages}
                  onChange={(event) => setMemorizationPages(event.target.value)}
                  placeholder="e.g. 21-23 or start of Juz 2"
                  className="bg-slate-950 border-slate-800 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memorization-count" className="text-xs uppercase tracking-wider text-slate-500">Count</Label>
                <Input
                  id="memorization-count"
                  type="number"
                  min={0}
                  step={1}
                  value={memorizationPageCount}
                  onChange={(event) =>
                    setMemorizationPageCount(Math.max(0, Number(event.target.value) || 0))
                  }
                  className="bg-slate-950 border-slate-800 font-mono text-lg focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/20 text-amber-400">
                <BookOpenCheck className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-slate-200">Revision</h3>
            </div>
            <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
              <div className="space-y-2">
                <Label htmlFor="revision-pages" className="text-xs uppercase tracking-wider text-slate-500">Pages/Sections</Label>
                <Input
                  id="revision-pages"
                  value={revisionPages}
                  onChange={(event) => setRevisionPages(event.target.value)}
                  placeholder="e.g. 18-20"
                  className="bg-slate-950 border-slate-800 focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revision-count" className="text-xs uppercase tracking-wider text-slate-500">Count</Label>
                <Input
                  id="revision-count"
                  type="number"
                  min={0}
                  step={1}
                  value={revisionPageCount}
                  onChange={(event) =>
                    setRevisionPageCount(Math.max(0, Number(event.target.value) || 0))
                  }
                  className="bg-slate-950 border-slate-800 font-mono text-lg focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
            <div className="space-y-2">
              <Label htmlFor="entry-state" className="text-xs uppercase tracking-wider text-slate-500">Day Status</Label>
              <Select value={entryState} onValueChange={(value) => setEntryState(value as EntryState)}>
                <SelectTrigger id="entry-state" className="bg-slate-900 border-slate-800 h-10">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="completed" className="focus:bg-emerald-500/10 focus:text-emerald-400">Completed</SelectItem>
                  <SelectItem value="partial" className="focus:bg-amber-500/10 focus:text-amber-400">Partial</SelectItem>
                  <SelectItem value="skipped" className="focus:bg-rose-500/10 focus:text-rose-400">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="day-note" className="text-xs uppercase tracking-wider text-slate-500">Notes & Reflexions</Label>
              <div className="relative">
                <Edit3 className="absolute right-3 top-3 h-4 w-4 text-slate-600" />
                <Textarea
                  id="day-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Memory weak points, tajwid reminders, or revision notes…"
                  className="min-h-[100px] bg-slate-900 border-slate-800 pr-10 focus-visible:border-slate-600 focus-visible:ring-slate-600/20"
                />
              </div>
            </div>
          </div>
        </div>

        <Footer className="border-t border-slate-800 bg-slate-950/80 px-6 py-4 backdrop-blur-md flex-row justify-between shrink-0 mt-auto">
          {hasExistingLog ? (
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await onClear(day.date);
              }}
              disabled={isSaving}
              className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear day
            </Button>
          ) : (
            <div />
          )}
          <Button type="submit" disabled={isSaving} className="bg-slate-100 text-slate-900 hover:bg-white shadow-[0_0_20px_rgba(255,255,255,0.1)] px-8 font-medium">
            {isSaving ? "Saving…" : "Save Record"}
          </Button>
        </Footer>
      </form>
    </>
  );

  return (
    <Container open={open} onOpenChange={onOpenChange}>
      <Content
        side={isMobile ? undefined : "right"}
        className={cn(
          "gap-0 overflow-hidden p-0 border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-2xl",
          isMobile ? "max-h-[92vh]" : "w-full max-w-lg border-l",
        )}
      >
        {content}
      </Content>
    </Container>
  );
}
