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
      <Header className="gap-4 border-b border-slate-200 bg-slate-50/90 pb-6 pt-8 px-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge
            variant="outline"
            className={cn(
              "border font-semibold tracking-wider text-[11px] uppercase shadow-sm px-2.5 py-0.5",
              day.plannedDayType === "memorization"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700",
            )}
          >
            {day.plannedDayType === "memorization" ? "Memorization Day" : "Revision Day"}
          </Badge>
          <Badge
            variant="outline"
            className="border-slate-200 bg-white text-slate-600 font-semibold tracking-wider text-[11px] uppercase px-2.5 py-0.5"
          >
            {day.visualState}
          </Badge>
        </div>
        <div className="space-y-1.5 mt-1">
          <Title className="text-2xl font-bold tracking-tight text-slate-950">{formattedDate}</Title>
          <Description className="text-slate-600 text-sm leading-relaxed">
            Freeform page labels stay exactly as typed. Numeric counts drive the weekly and challenge progress totals.
          </Description>
        </div>
      </Header>

      <form
        className="flex flex-1 flex-col overflow-y-auto bg-white"
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
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.28)]">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                <BookOpen className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-slate-900">Memorization</h3>
            </div>
            <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
              <div className="space-y-2">
                <Label htmlFor="memorization-pages" className="text-xs uppercase tracking-wider text-slate-500">Pages/Sections</Label>
                <Input
                  id="memorization-pages"
                  value={memorizationPages}
                  onChange={(event) => setMemorizationPages(event.target.value)}
                  placeholder="e.g. 21-23 or start of Juz 2"
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
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
                  className="bg-white border-slate-300 font-mono text-lg text-slate-900 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.28)]">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                <BookOpenCheck className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-slate-900">Revision</h3>
            </div>
            <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
              <div className="space-y-2">
                <Label htmlFor="revision-pages" className="text-xs uppercase tracking-wider text-slate-500">Pages/Sections</Label>
                <Input
                  id="revision-pages"
                  value={revisionPages}
                  onChange={(event) => setRevisionPages(event.target.value)}
                  placeholder="e.g. 18-20"
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20"
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
                  className="bg-white border-slate-300 font-mono text-lg text-slate-900 focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
            <div className="space-y-2">
              <Label htmlFor="entry-state" className="text-xs uppercase tracking-wider text-slate-500">Day Status</Label>
              <Select value={entryState} onValueChange={(value) => setEntryState(value as EntryState)}>
                <SelectTrigger id="entry-state" className="h-10 w-full bg-white border-slate-300 text-slate-900">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="completed" className="focus:bg-emerald-50 focus:text-emerald-700">Completed</SelectItem>
                  <SelectItem value="partial" className="focus:bg-amber-50 focus:text-amber-700">Partial</SelectItem>
                  <SelectItem value="skipped" className="focus:bg-rose-50 focus:text-rose-700">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="day-note" className="text-xs uppercase tracking-wider text-slate-500">Notes & Reflections</Label>
              <div className="relative">
                <Edit3 className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                <Textarea
                  id="day-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Memory weak points, tajwid reminders, or revision notes…"
                  className="min-h-[100px] bg-white border-slate-300 pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-slate-500 focus-visible:ring-slate-500/20"
                />
              </div>
            </div>
          </div>
        </div>

        <Footer className="border-t border-slate-200 bg-white px-6 py-4 flex-row justify-between shrink-0 mt-auto">
          {hasExistingLog ? (
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await onClear(day.date);
              }}
              disabled={isSaving}
              className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear day
            </Button>
          ) : (
            <div />
          )}
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-slate-900 text-white hover:bg-slate-800 px-8 font-medium"
          >
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
          "gap-0 overflow-hidden p-0 border-slate-200 bg-white shadow-[0_28px_90px_-48px_rgba(15,23,42,0.45)]",
          isMobile ? "max-h-[92vh]" : "w-full max-w-lg border-l",
        )}
      >
        {content}
      </Content>
    </Container>
  );
}
