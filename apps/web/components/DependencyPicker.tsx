'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, CheckCircle2, Circle, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type TaskPriorityLevel = 'low' | 'medium' | 'high' | 'urgent' | 'critical';

const priorityTokens: Record<TaskPriorityLevel, { label: string; badge: string }> = {
  low: {
    label: 'Low',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  medium: {
    label: 'Medium',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  },
  high: {
    label: 'High',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  },
  urgent: {
    label: 'Urgent',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
  critical: {
    label: 'Critical',
    badge: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200',
  },
};

const statusIcons = {
  todo: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
  in_progress: <Clock className="h-3.5 w-3.5 text-blue-500" />,
  done: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
};

interface DependencyPickerProps {
  taskId: Id<'tasks'>;
  mode: 'add_blocker' | 'add_blocked';
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function DependencyPicker({
  taskId,
  mode,
  trigger,
  onSuccess,
}: DependencyPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableTasks = useQuery(
    api.dependencies.getAvailableBlockers,
    open ? { taskId } : 'skip'
  );

  const createDependency = useMutation(api.dependencies.create);

  const filteredTasks = useMemo(() => {
    if (!availableTasks) return [];
    const searchLower = search.toLowerCase();
    return availableTasks.filter((task) =>
      task?.title.toLowerCase().includes(searchLower)
    );
  }, [availableTasks, search]);

  const handleSelect = async (selectedTaskId: Id<'tasks'>) => {
    setIsSubmitting(true);
    try {
      if (mode === 'add_blocker') {
        // selectedTask blocks taskId
        await createDependency({
          blockedTaskId: taskId,
          blockingTaskId: selectedTaskId,
        });
        toast.success('Blocker added');
      } else {
        // taskId blocks selectedTask
        await createDependency({
          blockedTaskId: selectedTaskId,
          blockingTaskId: taskId,
        });
        toast.success('Dependency added');
      }
      setOpen(false);
      setSearch('');
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add dependency'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTitle =
    mode === 'add_blocker'
      ? 'Add a blocker'
      : 'Select a task to block';

  const dialogDescription =
    mode === 'add_blocker'
      ? 'Choose a task that must be completed before this one.'
      : 'Choose a task that will be blocked by this one.';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
            <Plus className="h-3 w-3" />
            Add dependency
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <p className="text-sm text-muted-foreground">{dialogDescription}</p>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <ScrollArea className="max-h-[300px]">
          {availableTasks === undefined ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {search
                ? 'No matching tasks found'
                : 'No available tasks to link'}
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {filteredTasks.map((task) => {
                if (!task) return null;
                const priority = (task.priorityLevel ??
                  'low') as TaskPriorityLevel;
                const priorityMeta = priorityTokens[priority];

                return (
                  <button
                    key={task._id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSelect(task._id)}
                    className={cn(
                      'w-full rounded-lg border border-transparent p-3 text-left transition-colors',
                      'hover:bg-accent hover:border-border',
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                      'disabled:opacity-50 disabled:pointer-events-none'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {statusIcons[task.status as keyof typeof statusIcons]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {task.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px]', priorityMeta.badge)}
                          >
                            {priorityMeta.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface DependencyListItemProps {
  task: Doc<'tasks'>;
  onRemove: () => Promise<void>;
  isRemoving?: boolean;
}

export function DependencyListItem({
  task,
  onRemove,
  isRemoving,
}: DependencyListItemProps) {
  const priority = (task.priorityLevel ?? 'low') as TaskPriorityLevel;
  const priorityMeta = priorityTokens[priority];

  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 p-2">
      <div className="flex items-center gap-2 min-w-0">
        {statusIcons[task.status as keyof typeof statusIcons]}
        <span className="text-sm truncate">{task.title}</span>
        <Badge variant="secondary" className={cn('text-[10px] shrink-0', priorityMeta.badge)}>
          {priorityMeta.label}
        </Badge>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        disabled={isRemoving}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
