"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
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
      <Header className="gap-3 border-b border-border/50 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "border font-medium",
              day.plannedDayType === "memorization"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
            )}
          >
            {day.plannedDayType === "memorization" ? "Memorization day" : "Revision day"}
          </Badge>
          <Badge variant="outline" className="border-slate-500/30 bg-slate-500/10">
            {day.visualState}
          </Badge>
        </div>
        <div className="space-y-1">
          <Title className="text-xl tracking-tight">{formattedDate}</Title>
          <Description>
            Freeform page labels stay exactly as typed. Numeric counts drive the weekly and
            challenge progress totals.
          </Description>
        </div>
      </Header>

      <form
        className="flex flex-1 flex-col overflow-y-auto"
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
        <div className="flex-1 space-y-5 p-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_108px]">
            <div className="space-y-2">
              <Label htmlFor="memorization-pages">Memorization pages</Label>
              <Input
                id="memorization-pages"
                value={memorizationPages}
                onChange={(event) => setMemorizationPages(event.target.value)}
                placeholder="e.g. 21-23 or start of Juz 2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memorization-count">Count</Label>
              <Input
                id="memorization-count"
                type="number"
                min={0}
                step={1}
                value={memorizationPageCount}
                onChange={(event) =>
                  setMemorizationPageCount(Math.max(0, Number(event.target.value) || 0))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_108px]">
            <div className="space-y-2">
              <Label htmlFor="revision-pages">Revision pages</Label>
              <Input
                id="revision-pages"
                value={revisionPages}
                onChange={(event) => setRevisionPages(event.target.value)}
                placeholder="e.g. 18-20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revision-count">Count</Label>
              <Input
                id="revision-count"
                type="number"
                min={0}
                step={1}
                value={revisionPageCount}
                onChange={(event) =>
                  setRevisionPageCount(Math.max(0, Number(event.target.value) || 0))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-state">Day status</Label>
            <Select value={entryState} onValueChange={(value) => setEntryState(value as EntryState)}>
              <SelectTrigger id="entry-state">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="day-note">Notes</Label>
            <Textarea
              id="day-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Memory weak points, tajwid reminders, or revision notes…"
              className="min-h-32"
            />
          </div>
        </div>

        <Footer className="border-t border-border/50 bg-background/95">
          {hasExistingLog ? (
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await onClear(day.date);
              }}
              disabled={isSaving}
            >
              Clear day
            </Button>
          ) : (
            <div />
          )}
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving…" : "Save day"}
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
          "gap-0 overflow-hidden p-0",
          isMobile ? "max-h-[92vh]" : "w-full max-w-xl border-l border-border/50",
        )}
      >
        {content}
      </Content>
    </Container>
  );
}
