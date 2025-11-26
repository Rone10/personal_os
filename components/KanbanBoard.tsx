'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { Plus, GripVertical, CheckCircle2, Circle, Clock, Link as LinkIcon, RefreshCw, AlignLeft, Calendar, Users, Paperclip, Tag, Flag, PencilLine, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useMemo, useId } from 'react';
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent, 
  useDroppable, 
  DragOverlay,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  DropAnimation
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { FeaturePanel } from '@/app/projects/_components/FeaturePanel';
import { toast } from 'sonner';

interface KanbanBoardProps {
  projectId: Id<"projects">;
  showFeaturePanel?: boolean;
}

type TaskStatus = "todo" | "in_progress" | "done";
const COLUMN_IDS: TaskStatus[] = ["todo", "in_progress", "done"];
type TaskPriorityLevel = "low" | "medium" | "high" | "urgent" | "critical";
type KanbanTask = Doc<"tasks"> & { priorityLevel: TaskPriorityLevel };
type TaskEditPayload = {
  title: string;
  description: string | null;
  priorityLevel: TaskPriorityLevel;
  dueDate: number | null;
  assignees: string[];
  attachments: string[];
  tags: string[];
};

type FeatureRecord = Doc<"projectFeatures"> & {
  checklist: Doc<"featureChecklistItems">[];
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };
};

type TaskFeatureMeta = {
  featureId: Id<"projectFeatures">;
  featureTitle: string;
  checklistId?: Id<"featureChecklistItems">;
  checklistTitle?: string;
};

const PRIORITY_OPTIONS: TaskPriorityLevel[] = ["low", "medium", "high", "urgent", "critical"];

const fallbackPriorityLevel = (task: Doc<"tasks">): TaskPriorityLevel => {
  if (task.priorityLevel) return task.priorityLevel as TaskPriorityLevel;
  switch (task.priority) {
    case 2:
      return "medium";
    case 3:
      return "high";
    case 4:
      return "urgent";
    case 5:
      return "critical";
    default:
      return "low";
  }
};

const priorityTokens: Record<TaskPriorityLevel, { label: string; border: string; badge: string; dot: string }> = {
  low: {
    label: "Low",
    border: "border-l-emerald-400",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-400",
  },
  medium: {
    label: "Medium",
    border: "border-l-amber-400",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    dot: "bg-amber-400",
  },
  high: {
    label: "High",
    border: "border-l-orange-500",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  urgent: {
    label: "Urgent",
    border: "border-l-red-500",
    badge: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    dot: "bg-red-500",
  },
  critical: {
    label: "Critical",
    border: "border-l-fuchsia-500",
    badge: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
    dot: "bg-fuchsia-500",
  },
};

const normalizeTask = (task: Doc<"tasks">): KanbanTask => ({
  ...task,
  priorityLevel: fallbackPriorityLevel(task),
});

const startOfDay = (date: Date) => {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
};

const formatShortDate = (timestamp?: number) => {
  if (!timestamp) return "No due date";
  const date = new Date(timestamp);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
};

const formatRelativeDueDate = (timestamp?: number) => {
  if (!timestamp) return "No due date";
  const due = startOfDay(new Date(timestamp));
  const today = startOfDay(new Date());
  const diffDays = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return formatShortDate(timestamp);
};

interface LinkedTodoMeta {
  taskId: Id<"tasks">;
  todoId: Id<"todos">;
  todoTitle: string;
  todoStatus: TaskStatus;
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

function TaskCard({
  task,
  onAdvance,
  isOverlay,
  linkedTodo,
  featureMeta,
  onFeatureInspect,
  onUnlinkFeature,
  isExpanded = false,
  onToggleExpand,
  onSaveTask,
  onDeleteTask,
}: {
  task: KanbanTask;
  onAdvance?: (task: KanbanTask) => void;
  isOverlay?: boolean;
  linkedTodo?: LinkedTodoMeta;
  featureMeta?: TaskFeatureMeta;
  onFeatureInspect?: (featureId: Id<'projectFeatures'>) => void;
  onUnlinkFeature?: () => Promise<void> | void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onSaveTask?: (payload: TaskEditPayload) => Promise<void>;
  onDeleteTask?: () => Promise<void>;
}) {
  const priorityMeta = priorityTokens[task.priorityLevel];
  const expanded = Boolean(isExpanded);

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-l-4 bg-card p-4 text-card-foreground shadow-sm transition-all",
        "min-h-24",
        priorityMeta.border,
        isOverlay
          ? "cursor-grabbing shadow-xl rotate-2 scale-105 ring-2 ring-primary/20"
          : "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0 hover:text-primary",
              task.status === "done"
                ? "text-emerald-600 dark:text-emerald-400"
                : task.status === "in_progress"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-muted-foreground",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onAdvance?.(task);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {task.status === "done" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : task.status === "in_progress" ? (
              <Clock className="h-4 w-4" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
          </Button>
          <button
            type="button"
            className="flex flex-col gap-1 text-left cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span
              className={cn(
                "text-sm font-medium leading-tight",
                task.status === "done" && "text-muted-foreground line-through",
              )}
            >
              {task.title}
            </span>
            {!expanded && (
              <div className="flex flex-wrap gap-3 text-xs font-medium text-muted-foreground">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] uppercase",
                    priorityMeta.badge,
                    "border-transparent text-foreground",
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", priorityMeta.dot)} />
                  {priorityMeta.label}
                </span>
                <span>{formatRelativeDueDate(task.dueDate)}</span>
              </div>
            )}
            {!expanded && featureMeta && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <button
                  type="button"
                  className="inline-flex items-center gap-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    onFeatureInspect?.(featureMeta.featureId);
                  }}
                >
                  <Badge variant="outline" className="border-blue-400 text-blue-600 dark:text-blue-300">
                    {featureMeta.featureTitle}
                    {featureMeta.checklistTitle ? ` / ${featureMeta.checklistTitle}` : ''}
                  </Badge>
                </button>
                {onUnlinkFeature && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground"
                    onClick={(event) => {
                      event.stopPropagation();
                      void onUnlinkFeature();
                    }}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </button>
        </div>
        <div className="flex items-center gap-1">
          {onSaveTask && <TaskQuickEditDialog task={task} onSave={onSaveTask} />}
          {onDeleteTask && <TaskDeleteDialog taskTitle={task.title} onDelete={onDeleteTask} />}
          <div className="opacity-0 transition-opacity group-hover:opacity-100">
            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </div>
      </div>

      {expanded && (
        <div
          className="mt-3 space-y-3 border-t border-dashed border-muted-foreground/30 pt-3"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DetailRow
            icon={<Flag className="h-3.5 w-3.5" />}
            label="Priority"
          >
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-2 py-1 text-[11px] font-semibold uppercase",
                priorityMeta.badge,
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", priorityMeta.dot)} />
              {priorityMeta.label}
            </span>
          </DetailRow>

          <DetailRow icon={<AlignLeft className="h-3.5 w-3.5" />} label="Description">
            {task.description ? (
              <p className="text-sm text-foreground">{task.description}</p>
            ) : (
              <span className="text-sm text-muted-foreground">No description yet.</span>
            )}
          </DetailRow>

          <DetailRow icon={<Calendar className="h-3.5 w-3.5" />} label="Due Date">
            <span className="text-sm text-foreground">{formatRelativeDueDate(task.dueDate)}</span>
          </DetailRow>

          <DetailRow icon={<Users className="h-3.5 w-3.5" />} label="Assignees">
            {task.assignees && task.assignees.length ? (
              <div className="flex flex-wrap gap-2">
                {task.assignees.map((person) => (
                  <Badge key={person} variant="secondary" className="bg-muted px-2 py-0.5 text-xs">
                    {person}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Unassigned</span>
            )}
          </DetailRow>

          <DetailRow icon={<Tag className="h-3.5 w-3.5" />} label="Labels">
            {task.tags && task.tags.length ? (
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs uppercase tracking-wide">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">No labels</span>
            )}
          </DetailRow>

          <DetailRow icon={<Paperclip className="h-3.5 w-3.5" />} label="Attachments">
            {task.attachments && task.attachments.length ? (
              <div className="flex flex-col gap-2">
                {task.attachments.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary underline underline-offset-4"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {url}
                  </a>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">No attachments</span>
            )}
          </DetailRow>

          {featureMeta && (
            <DetailRow icon={<LinkIcon className="h-3.5 w-3.5" />} label="Feature">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    onFeatureInspect?.(featureMeta.featureId);
                  }}
                >
                  <Badge variant="secondary">
                    {featureMeta.featureTitle}
                    {featureMeta.checklistTitle ? ` / ${featureMeta.checklistTitle}` : ''}
                  </Badge>
                </button>
                {onUnlinkFeature && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      void onUnlinkFeature();
                    }}
                  >
                    Unlink
                  </Button>
                )}
              </div>
            </DetailRow>
          )}

          {linkedTodo && <LinkedTodoBadge meta={linkedTodo} taskId={task._id} />}
        </div>
      )}
    </div>
  );
}

type TaskQuickEditFormState = {
  title: string;
  description: string;
  priorityLevel: TaskPriorityLevel;
  dueDate: string;
  assignees: string;
  attachments: string;
  tags: string;
};

const toDateInputValue = (timestamp?: number) => {
  if (!timestamp) return "";
  return new Date(timestamp).toISOString().split("T")[0];
};

const parseDateValue = (value: string): number | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
};

const cleanCommaList = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const cleanLineList = (value: string) =>
  value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const buildFormState = (task: KanbanTask): TaskQuickEditFormState => ({
  title: task.title,
  description: task.description ?? "",
  priorityLevel: task.priorityLevel,
  dueDate: toDateInputValue(task.dueDate ?? undefined),
  assignees: (task.assignees ?? []).join(", "),
  attachments: (task.attachments ?? []).join("\n"),
  tags: (task.tags ?? []).join(", "),
});

function TaskQuickEditDialog({ task, onSave }: { task: KanbanTask; onSave: (payload: TaskEditPayload) => Promise<void> }) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState<TaskQuickEditFormState>(() => buildFormState(task));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFormState(buildFormState(task));
      setError(null);
    }
  }, [task, open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const trimmedTitle = formState.title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      setIsSaving(false);
      return;
    }

    const payload: TaskEditPayload = {
      title: trimmedTitle,
      description: formState.description.trim() ? formState.description.trim() : null,
      priorityLevel: formState.priorityLevel,
      dueDate: parseDateValue(formState.dueDate),
      assignees: cleanCommaList(formState.assignees),
      attachments: cleanLineList(formState.attachments),
      tags: cleanCommaList(formState.tags),
    };

    try {
      await onSave(payload);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof TaskQuickEditFormState>(key: K, value: TaskQuickEditFormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <PencilLine className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit “{task.title}”</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-title`}>Title</Label>
            <Input
              id={`${formId}-title`}
              value={formState.title}
              onChange={(e) => updateField("title", e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-description`}>Description</Label>
            <Textarea
              id={`${formId}-description`}
              value={formState.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-priority`}>Priority</Label>
              <Select
                value={formState.priorityLevel}
                onValueChange={(value) => updateField("priorityLevel", value as TaskPriorityLevel)}
              >
                <SelectTrigger id={`${formId}-priority`}>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((level) => (
                    <SelectItem key={level} value={level} className="capitalize">
                      {priorityTokens[level].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-due-date`}>Due Date</Label>
              <Input
                id={`${formId}-due-date`}
                type="date"
                value={formState.dueDate}
                onChange={(e) => updateField("dueDate", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-assignees`}>Assignees</Label>
            <Input
              id={`${formId}-assignees`}
              value={formState.assignees}
              placeholder="Comma-separated names"
              onChange={(e) => updateField("assignees", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Example: Han, Leia, Chewbacca</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-tags`}>Labels</Label>
            <Input
              id={`${formId}-tags`}
              value={formState.tags}
              placeholder="Comma-separated labels"
              onChange={(e) => updateField("tags", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-attachments`}>Attachments</Label>
            <Textarea
              id={`${formId}-attachments`}
              value={formState.attachments}
              onChange={(e) => updateField("attachments", e.target.value)}
              rows={3}
              placeholder="One URL per line"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskDeleteDialog({ taskTitle, onDelete }: { taskTitle: string; onDelete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this task?</AlertDialogTitle>
          <AlertDialogDescription>
            “{taskTitle}” will be permanently removed along with its linked metadata. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete task"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SortableTask({
  task,
  onAdvance,
  linkedTodo,
  featureMeta,
  onFeatureInspect,
  onUnlinkFeature,
  isExpanded,
  onToggleExpand,
  onSaveTask,
  onDeleteTask,
}: {
  task: KanbanTask;
  onAdvance: (task: KanbanTask) => void;
  linkedTodo?: LinkedTodoMeta;
  featureMeta?: TaskFeatureMeta;
  onFeatureInspect?: (featureId: Id<'projectFeatures'>) => void;
  onUnlinkFeature?: () => Promise<void> | void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSaveTask: (payload: TaskEditPayload) => Promise<void>;
  onDeleteTask: () => Promise<void>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id, data: { task } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  
  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="opacity-0">
        <TaskCard
          task={task}
          onAdvance={onAdvance}
          linkedTodo={linkedTodo}
          featureMeta={featureMeta}
          onFeatureInspect={onFeatureInspect}
          onUnlinkFeature={onUnlinkFeature}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
          onSaveTask={onSaveTask}
          onDeleteTask={onDeleteTask}
        />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard
        task={task}
        onAdvance={onAdvance}
        linkedTodo={linkedTodo}
        featureMeta={featureMeta}
        onFeatureInspect={onFeatureInspect}
        onUnlinkFeature={onUnlinkFeature}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        onSaveTask={onSaveTask}
        onDeleteTask={onDeleteTask}
      />
    </div>
  );
}

function DroppableColumn({ id, title, count, children, className, headerColor }: { 
  id: string, 
  title: string, 
  count: number, 
  children: React.ReactNode, 
  className?: string,
  headerColor?: string
}) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div ref={setNodeRef} className={cn("flex h-full flex-col rounded-xl bg-muted/50 p-4", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", headerColor || "bg-slate-400")} />
          <h3 className="font-semibold text-sm text-foreground/80">{title}</h3>
        </div>
        <Badge variant="secondary" className="bg-background text-muted-foreground hover:bg-background">
          {count}
        </Badge>
      </div>
      
      <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto pr-2 -mr-2">
        {children}
      </div>
    </div>
  );
}

export function KanbanBoard({ projectId, showFeaturePanel = false }: KanbanBoardProps) {
  const tasksQuery = useQuery(api.tasks.getByProject, { projectId });
  const features = useQuery(api.features.listByProject, { projectId }) as FeatureRecord[] | undefined;
  const createTask = useMutation(api.tasks.create);
  const moveTask = useMutation(api.tasks.move);
  const updateTaskMutation = useMutation(api.tasks.updateTask);
  const deleteTaskMutation = useMutation(api.tasks.deleteTask);
  const linkTaskToFeatureMutation = useMutation(api.features.linkTaskToFeature);
  const unlinkTaskFromFeatureMutation = useMutation(api.features.unlinkTaskFromFeature);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeId, setActiveId] = useState<Id<"tasks"> | null>(null);
  const [localTasks, setLocalTasks] = useState<KanbanTask[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [focusedFeatureId, setFocusedFeatureId] = useState<Id<"projectFeatures"> | null>(null);
  const prevTasksQuery = React.useRef(tasksQuery);

  const handleAdvance = (task: KanbanTask) => {
    const nextStatus: "todo" | "in_progress" | "done" = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
    
    // Calculate new order (append to end of destination column)
    const columnTasks = localTasks.filter(t => t.status === nextStatus);
    const maxOrder = columnTasks.length > 0 ? Math.max(...columnTasks.map(t => t.order || 0)) : 0;
    const newOrder = maxOrder + 1000;

    // Optimistic update
    const updatedTasks = localTasks.map(t => 
      t._id === task._id ? { ...t, status: nextStatus, order: newOrder } : t
    );
    setLocalTasks(updatedTasks);

    moveTask({ id: task._id, status: nextStatus, newOrder });
  };

  const persistTaskEdit = async (taskId: Id<"tasks">, payload: TaskEditPayload) => {
    let snapshot: KanbanTask[] = [];
    setLocalTasks((prev) => {
      snapshot = prev;
      return prev.map((task) =>
        task._id === taskId
          ? {
              ...task,
              title: payload.title,
              description: payload.description ?? undefined,
              priorityLevel: payload.priorityLevel,
              dueDate: payload.dueDate ?? undefined,
              assignees: payload.assignees,
              attachments: payload.attachments,
              tags: payload.tags,
            }
          : task,
      );
    });

    try {
      await updateTaskMutation({
        id: taskId,
        title: payload.title,
        description: payload.description,
        priorityLevel: payload.priorityLevel,
        dueDate: payload.dueDate,
        assignees: payload.assignees,
        attachments: payload.attachments,
        tags: payload.tags,
      });
    } catch (error) {
      setLocalTasks(snapshot);
      throw error;
    }
  };

  const deleteTaskOptimistic = async (taskId: Id<"tasks">) => {
    let snapshot: KanbanTask[] = [];
    setLocalTasks((prev) => {
      snapshot = prev;
      return prev.filter((task) => task._id !== taskId);
    });
    setExpandedTasks((prev) => {
      if (!prev.has(taskId.toString())) return prev;
      const next = new Set(prev);
      next.delete(taskId.toString());
      return next;
    });

    try {
      await deleteTaskMutation({ id: taskId });
    } catch (error) {
      setLocalTasks(snapshot);
      throw error;
    }
  };

  const toggleTaskExpansion = (taskId: Id<"tasks">) => {
    const key = taskId.toString();
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Sync local state with backend state when backend updates, 
  // but ONLY if we are not currently dragging to avoid fighting with the drag state
  useEffect(() => {
    if (!tasksQuery) return;
    
    if (tasksQuery !== prevTasksQuery.current && !activeId) {
      // Sort by order if available, otherwise by creation time (id)
      const sorted = [...tasksQuery].sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      }).map(normalizeTask);
      setLocalTasks(sorted);
      prevTasksQuery.current = tasksQuery;
    } else if (localTasks.length === 0 && tasksQuery.length > 0) {
       // Initial load
       const sorted = [...tasksQuery].sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      }).map(normalizeTask);
      setLocalTasks(sorted);
      prevTasksQuery.current = tasksQuery;
    }
  }, [tasksQuery, activeId, localTasks.length]);

  // Keep expansion state in sync with the tasks that still exist in the column
  useEffect(() => {
    setExpandedTasks((prev) => {
      const activeIds = new Set(localTasks.map((task) => task._id.toString()));
      let mutated = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (activeIds.has(id)) {
          next.add(id);
        } else {
          mutated = true;
        }
      });
      return mutated ? next : prev;
    });
  }, [localTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const columns = useMemo(() => {
    return {
      todo: localTasks.filter((t) => t.status === 'todo'),
      in_progress: localTasks.filter((t) => t.status === 'in_progress'),
      done: localTasks.filter((t) => t.status === 'done'),
    };
  }, [localTasks]);

  const featureMap = useMemo(() => {
    const map = new Map<string, FeatureRecord>();
    (features ?? []).forEach((feature) => {
      map.set(feature._id.toString(), feature);
    });
    return map;
  }, [features]);

  const checklistMap = useMemo(() => {
    const map = new Map<string, { featureId: Id<'projectFeatures'>; item: Doc<'featureChecklistItems'> }>();
    (features ?? []).forEach((feature) => {
      feature.checklist.forEach((item) => {
        map.set(item._id.toString(), { featureId: feature._id, item });
      });
    });
    return map;
  }, [features]);
  const taskFeatureMetaMap = useMemo(() => {
    const map = new Map<string, TaskFeatureMeta>();
    localTasks.forEach((task) => {
      if (!task.featureId) return;
      const feature = featureMap.get(task.featureId.toString());
      if (!feature) return;
      const checklistInfo = task.featureChecklistItemId
        ? checklistMap.get(task.featureChecklistItemId.toString())
        : undefined;
      map.set(task._id.toString(), {
        featureId: feature._id,
        featureTitle: feature.title,
        checklistId: checklistInfo?.item._id,
        checklistTitle: checklistInfo?.item.title,
      });
    });
    return map;
  }, [localTasks, featureMap, checklistMap]);

  const handleLinkToFeatureTarget = async (
    taskId: Id<"tasks">,
    target: { featureId: Id<"projectFeatures">; checklistId?: Id<"featureChecklistItems"> },
  ) => {
    let snapshot: KanbanTask[] = [];
    setLocalTasks((prev) => {
      snapshot = prev;
      return prev.map((task) =>
        task._id === taskId
          ? { ...task, featureId: target.featureId, featureChecklistItemId: target.checklistId }
          : task,
      );
    });

    try {
      await linkTaskToFeatureMutation({
        taskId,
        featureId: target.featureId,
        checklistId: target.checklistId,
      });
      toast.success('Task linked to feature');
    } catch (error) {
      console.error(error);
      setLocalTasks(snapshot);
      toast.error('Unable to link task');
    }
  };

  const handleUnlinkFeature = async (taskId: Id<"tasks">) => {
    let snapshot: KanbanTask[] = [];
    setLocalTasks((prev) => {
      snapshot = prev;
      return prev.map((task) =>
        task._id === taskId ? { ...task, featureId: undefined, featureChecklistItemId: undefined } : task,
      );
    });

    try {
      await unlinkTaskFromFeatureMutation({ taskId });
      toast.success('Task unlinked from feature');
    } catch (error) {
      console.error(error);
      setLocalTasks(snapshot);
      toast.error('Unable to unlink task');
    }
  };

  const taskIds = useMemo(() => {
    return localTasks.map((task) => task._id).sort((a, b) => a.localeCompare(b));
  }, [localTasks]);

  const linkedMeta = useQuery(api.todos.getLinkedTodoMeta, { taskIds });
  const linkedMetaMap = useMemo(() => {
    const map = new Map<string, LinkedTodoMeta>();
    (linkedMeta || []).forEach((entry) => {
      map.set(entry.taskId.toString(), entry as LinkedTodoMeta);
    });
    return map;
  }, [linkedMeta]);

  const focusedFeature = focusedFeatureId ? featureMap.get(focusedFeatureId.toString()) : undefined;
  const focusedFeatureTasks = useMemo(() => {
    if (!focusedFeatureId) return [] as KanbanTask[];
    const target = focusedFeatureId.toString();
    return localTasks.filter((task) => task.featureId?.toString() === target);
  }, [focusedFeatureId, localTasks]);

  if (tasksQuery === undefined) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-full rounded-xl bg-muted/50 p-4 animate-pulse">
            <div className="h-6 w-24 bg-muted rounded mb-4" />
            <div className="space-y-3">
              <div className="h-24 bg-muted rounded-xl" />
              <div className="h-24 bg-muted rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    await createTask({
      title: newTaskTitle,
      projectId,
      priorityLevel: "low",
    });
    
    setNewTaskTitle('');
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as Id<"tasks">);
  };

  const handleDragOver = () => {
    // We rely on drag end to reconcile state to avoid shuffling other cards mid-drag
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as Id<"tasks">;
    
    setActiveId(null);

    if (!over) return;

    const overId = over.id;
    const activeTask = localTasks.find(t => t._id === activeId);
    
    if (!activeTask) return;

    if (typeof overId === 'string' && overId.startsWith('feature:')) {
      const featureId = overId.replace('feature:', '') as Id<"projectFeatures">;
      void handleLinkToFeatureTarget(activeId, { featureId });
      return;
    }

    if (typeof overId === 'string' && overId.startsWith('checklist:')) {
      const checklistId = overId.replace('checklist:', '') as Id<"featureChecklistItems">;
      const checklistMeta = checklistMap.get(checklistId.toString());
      if (checklistMeta) {
        void handleLinkToFeatureTarget(activeId, {
          featureId: checklistMeta.featureId,
          checklistId,
        });
        return;
      }
    }

    const isColumnTarget = COLUMN_IDS.includes(overId as TaskStatus);
    const overTask = isColumnTarget ? undefined : localTasks.find(t => t._id === overId);

    let newStatus: TaskStatus = activeTask.status;
    if (isColumnTarget) {
      newStatus = overId as TaskStatus;
    } else if (overTask) {
      newStatus = overTask.status;
    }

    if (isColumnTarget) {
      const columnTasks = localTasks.filter(t => t.status === newStatus && t._id !== activeId);
      const maxOrder = columnTasks.length > 0 ? Math.max(...columnTasks.map(t => t.order || 0)) : 0;
      const newOrder = maxOrder + 1000;

      setLocalTasks(prev => {
        const next = prev.filter(t => t._id !== activeId);
        const updatedTask = { ...activeTask, status: newStatus, order: newOrder };
        return [...next, updatedTask].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      });

      moveTask({ id: activeId, status: newStatus, newOrder });
      return;
    }

    if (overTask) {
      const activeIndex = localTasks.findIndex(t => t._id === activeId);
      const overIndex = localTasks.findIndex(t => t._id === overTask._id);

      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
        return;
      }

      const reordered = arrayMove(localTasks, activeIndex, overIndex).map(t =>
        t._id === activeId ? { ...t, status: newStatus } : t
      );

      const statusTasks = reordered.filter(t => t.status === newStatus);
      const newIndexInStatus = statusTasks.findIndex(t => t._id === activeId);

      let newOrder;
      if (statusTasks.length === 1) {
        newOrder = statusTasks[0].order ?? Date.now();
      } else if (newIndexInStatus === 0) {
        const nextOrder = statusTasks[1]?.order || 0;
        newOrder = nextOrder - 1000;
      } else if (newIndexInStatus === statusTasks.length - 1) {
        const prevOrder = statusTasks[newIndexInStatus - 1]?.order || 0;
        newOrder = prevOrder + 1000;
      } else {
        const prevOrder = statusTasks[newIndexInStatus - 1]?.order || 0;
        const nextOrder = statusTasks[newIndexInStatus + 1]?.order || 0;
        newOrder = (prevOrder + nextOrder) / 2;
      }

      setLocalTasks(reordered.map(t =>
        t._id === activeId ? { ...t, order: newOrder, status: newStatus } : t
      ));

      moveTask({ 
        id: activeId, 
        status: newStatus, 
        newOrder: newOrder || Date.now() 
      });
    }
  };

  const activeTask = localTasks.find(t => t._id === activeId);

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart} 
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          'flex flex-col gap-6',
          showFeaturePanel && 'lg:grid lg:grid-cols-[360px_minmax(0,1fr)]'
        )}
      >
        {showFeaturePanel && (
          <div className="max-h-[80vh] overflow-y-auto">
            <FeaturePanel
              projectId={projectId}
              features={features}
              enableTaskTargets
              activeTaskId={activeId}
            />
          </div>
        )}

        <div className={cn('w-full', showFeaturePanel && 'lg:col-start-2')}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
            {/* TODO Column */}
            <div className="flex flex-col h-full">
              <DroppableColumn 
                id="todo" 
                title="To Do" 
                count={columns.todo.length} 
                headerColor="bg-slate-500"
                className="flex-1"
              >
                <SortableContext items={columns.todo.map(t => t._id)} strategy={verticalListSortingStrategy}>
                  {columns.todo.map((task) => (
                    <SortableTask
                      key={task._id}
                      task={task}
                      onAdvance={handleAdvance}
                      linkedTodo={linkedMetaMap.get(task._id.toString())}
                      featureMeta={taskFeatureMetaMap.get(task._id.toString())}
                      onFeatureInspect={(featureId) => setFocusedFeatureId(featureId)}
                      onUnlinkFeature={() => handleUnlinkFeature(task._id)}
                      isExpanded={expandedTasks.has(task._id.toString())}
                      onToggleExpand={() => toggleTaskExpansion(task._id)}
                      onSaveTask={(payload) => persistTaskEdit(task._id, payload)}
                      onDeleteTask={() => deleteTaskOptimistic(task._id)}
                    />
                  ))}
                </SortableContext>
                
                <form onSubmit={handleCreateTask} className="mt-2">
                  <div className="relative">
                    <Input 
                      placeholder="Add a task..." 
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="pr-8 bg-background shadow-sm border-dashed border-muted-foreground/30 focus:border-solid"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      variant="ghost"
                      className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-primary"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </DroppableColumn>
            </div>

            {/* IN PROGRESS Column */}
            <DroppableColumn 
              id="in_progress" 
              title="In Progress" 
              count={columns.in_progress.length} 
              headerColor="bg-blue-500"
            >
              <SortableContext items={columns.in_progress.map(t => t._id)} strategy={verticalListSortingStrategy}>
                  {columns.in_progress.map((task) => (
                    <SortableTask
                      key={task._id}
                      task={task}
                      onAdvance={handleAdvance}
                      linkedTodo={linkedMetaMap.get(task._id.toString())}
                      featureMeta={taskFeatureMetaMap.get(task._id.toString())}
                      onFeatureInspect={(featureId) => setFocusedFeatureId(featureId)}
                      onUnlinkFeature={() => handleUnlinkFeature(task._id)}
                      isExpanded={expandedTasks.has(task._id.toString())}
                      onToggleExpand={() => toggleTaskExpansion(task._id)}
                      onSaveTask={(payload) => persistTaskEdit(task._id, payload)}
                      onDeleteTask={() => deleteTaskOptimistic(task._id)}
                    />
                ))}
              </SortableContext>
            </DroppableColumn>

            {/* DONE Column */}
            <DroppableColumn 
              id="done" 
              title="Done" 
              count={columns.done.length} 
              headerColor="bg-green-500"
            >
              <SortableContext items={columns.done.map(t => t._id)} strategy={verticalListSortingStrategy}>
                  {columns.done.map((task) => (
                    <SortableTask
                      key={task._id}
                      task={task}
                      onAdvance={handleAdvance}
                      linkedTodo={linkedMetaMap.get(task._id.toString())}
                      featureMeta={taskFeatureMetaMap.get(task._id.toString())}
                      onFeatureInspect={(featureId) => setFocusedFeatureId(featureId)}
                      onUnlinkFeature={() => handleUnlinkFeature(task._id)}
                      isExpanded={expandedTasks.has(task._id.toString())}
                      onToggleExpand={() => toggleTaskExpansion(task._id)}
                      onSaveTask={(payload) => persistTaskEdit(task._id, payload)}
                      onDeleteTask={() => deleteTaskOptimistic(task._id)}
                    />
                ))}
              </SortableContext>
            </DroppableColumn>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            isOverlay
            featureMeta={taskFeatureMetaMap.get(activeTask._id.toString())}
            isExpanded={expandedTasks.has(activeTask._id.toString())}
          />
        ) : null}
      </DragOverlay>

      <FeatureDetailsSheet
        feature={focusedFeature}
        linkedTasks={focusedFeatureTasks}
        open={Boolean(focusedFeatureId)}
        onOpenChange={(open) => {
          if (!open) {
            setFocusedFeatureId(null);
          }
        }}
      />
    </DndContext>
  );
}

function FeatureDetailsSheet({
  feature,
  linkedTasks = [],
  open,
  onOpenChange,
}: {
  feature?: FeatureRecord;
  linkedTasks?: KanbanTask[];
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md border-l border-border/50 p-0">
        <ScrollArea className="h-full">
          <div className="space-y-6 p-6">
            <SheetHeader>
              <SheetTitle className="text-base font-semibold">
                {feature ? feature.title : 'Feature context'}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                {feature?.description ?? 'Select a feature badge to inspect scope, checklist, and linked tasks.'}
              </p>
            </SheetHeader>

            {feature ? (
              <div className="space-y-6">
                <section className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Progress</span>
                    <span>
                      {feature.progress.completed}/{feature.progress.total}
                    </span>
                  </div>
                  <Progress value={feature.progress.percentage} className="h-2" />
                </section>

                {feature.whatDoneLooksLike && (
                  <section className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      What done looks like
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {feature.whatDoneLooksLike}
                    </p>
                  </section>
                )}

                <Separator />

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checklist</p>
                    <Badge variant="outline">{feature.checklist.length}</Badge>
                  </div>
                  {feature.checklist.length ? (
                    <div className="space-y-2">
                      {feature.checklist.map((item) => (
                        <div key={item._id} className="rounded-xl border border-border/60 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-foreground">{item.title}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              )}
                            </div>
                            <Badge variant={item.status === 'done' ? 'default' : 'secondary'}>
                              {item.status === 'done' ? 'Done' : 'Todo'}
                            </Badge>
                          </div>
                          {item.linkedTaskIds?.length ? (
                            <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                              Linked tasks: {item.linkedTaskIds.length}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No checklist items yet.</p>
                  )}
                </section>

                <Separator />

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked tasks</p>
                    <Badge variant="secondary">{linkedTasks.length}</Badge>
                  </div>
                  {linkedTasks.length ? (
                    <div className="space-y-2">
                      {linkedTasks.map((task) => {
                        const checklistLabel = task.featureChecklistItemId
                          ? feature.checklist.find((item) => item._id === task.featureChecklistItemId)?.title
                          : undefined;
                        return (
                          <div key={task._id} className="rounded-xl border border-border/60 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-foreground">{task.title}</p>
                              <Badge variant="outline" className="text-[11px] uppercase">
                                {priorityTokens[task.priorityLevel].label}
                              </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatRelativeDueDate(task.dueDate)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <AlignLeft className="h-3 w-3" />
                                {task.status.replace('_', ' ')}
                              </span>
                              {checklistLabel && (
                                <span className="inline-flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {checklistLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tasks linked yet.</p>
                  )}
                </section>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                Select a feature badge to view scope, checklist, and linked tasks.
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="flex w-24 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

function LinkedTodoBadge({ meta, taskId }: { meta: LinkedTodoMeta; taskId: Id<"tasks"> }) {
  return (
    <div className="mt-2 flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-xs">
      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
        <LinkIcon className="h-3.5 w-3.5" />
        <span className="font-medium">{meta.todoTitle}</span>
      </div>
      <TaskRelinkDialog taskId={taskId} currentTodoId={meta.todoId} />
    </div>
  );
}

function TaskRelinkDialog({ taskId, currentTodoId }: { taskId: Id<"tasks">; currentTodoId: Id<"todos"> }) {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const todos = useQuery(api.todos.listTodos, {});
  const relinkTask = useMutation(api.todos.relinkTask);
  const unlinkTask = useMutation(api.todos.unlinkTaskFromTodo);

  const availableTodos = useMemo(() => (todos || []).filter((todo) => todo._id !== currentTodoId), [todos, currentTodoId]);

  const handleRelink = async (targetTodoId: Id<"todos">) => {
    setIsUpdating(true);
    await relinkTask({ sourceTodoId: currentTodoId, targetTodoId, taskId });
    setIsUpdating(false);
    setOpen(false);
  };

  const handleUnlink = async () => {
    setIsUpdating(true);
    await unlinkTask({ todoId: currentTodoId, taskId });
    setIsUpdating(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-blue-600">
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move task to another todo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">Select a destination todo or unlink entirely.</p>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {availableTodos.length ? (
              availableTodos.map((todo) => (
                <Button
                  key={todo._id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                  disabled={isUpdating}
                  onClick={() => handleRelink(todo._id)}
                >
                  <span className="text-left">
                    <span className="font-medium">{todo.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{todo.status}</span>
                  </span>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No other todos available.</p>
            )}
          </div>
          <Button type="button" variant="ghost" className="text-red-500" disabled={isUpdating} onClick={handleUnlink}>
            Unlink from todo
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}