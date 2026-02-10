'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Plus,
  Flag,
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

type MilestoneStatus = 'planned' | 'in_progress' | 'completed';

type MilestoneWithProgress = Doc<'milestones'> & {
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };
};

interface MilestoneBarProps {
  projectId: Id<'projects'>;
  milestones: MilestoneWithProgress[] | undefined;
  selectedMilestoneId: Id<'milestones'> | null;
  onSelectMilestone: (milestoneId: Id<'milestones'> | null) => void;
}

const STATUS_CONFIG: Record<
  MilestoneStatus,
  { label: string; icon: React.ReactNode; color: string; badge: string }
> = {
  planned: {
    label: 'Planned',
    icon: <Circle className="h-3 w-3" />,
    color: 'text-slate-500',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  in_progress: {
    label: 'In Progress',
    icon: <Clock className="h-3 w-3" />,
    color: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle2 className="h-3 w-3" />,
    color: 'text-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
};

const MILESTONE_COLORS = [
  { value: 'slate', label: 'Slate', class: 'bg-slate-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { value: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { value: 'rose', label: 'Rose', class: 'bg-rose-500' },
];

const getColorClass = (color?: string) => {
  const found = MILESTONE_COLORS.find((c) => c.value === color);
  return found?.class ?? 'bg-slate-500';
};

const formatDate = (timestamp?: number) => {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const toDateInputValue = (timestamp?: number) => {
  if (!timestamp) return '';
  return new Date(timestamp).toISOString().split('T')[0];
};

const parseDateValue = (value: string): number | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.getTime();
};

export function MilestoneBar({
  projectId,
  milestones,
  selectedMilestoneId,
  onSelectMilestone,
}: MilestoneBarProps) {
  const createMilestone = useMutation(api.milestones.create);
  const updateMilestone = useMutation(api.milestones.update);
  const removeMilestone = useMutation(api.milestones.remove);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editMilestone, setEditMilestone] = useState<MilestoneWithProgress | null>(null);

  const handleCreate = async (data: {
    title: string;
    description?: string;
    targetDate?: number;
    color?: string;
  }) => {
    try {
      await createMilestone({
        projectId,
        title: data.title,
        description: data.description,
        targetDate: data.targetDate,
        color: data.color,
      });
      toast.success('Milestone created');
      setCreateDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to create milestone');
    }
  };

  const handleUpdate = async (
    milestoneId: Id<'milestones'>,
    data: {
      title?: string;
      description?: string | null;
      targetDate?: number | null;
      status?: MilestoneStatus;
      color?: string | null;
    }
  ) => {
    try {
      await updateMilestone({
        milestoneId,
        ...data,
      });
      toast.success('Milestone updated');
      setEditMilestone(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update milestone');
    }
  };

  const handleDelete = async (milestoneId: Id<'milestones'>) => {
    try {
      await removeMilestone({ milestoneId });
      toast.success('Milestone deleted');
      if (selectedMilestoneId === milestoneId) {
        onSelectMilestone(null);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete milestone');
    }
  };

  const isLoading = milestones === undefined;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-slate-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Milestones
          </h3>
          {milestones && milestones.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {milestones.length}
            </Badge>
          )}
        </div>
        <MilestoneFormDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreate}
          trigger={
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 w-48 shrink-0 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : milestones.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-200 p-4 text-center dark:border-slate-800">
          <p className="text-xs text-muted-foreground">
            No milestones yet. Create one to organize work into release phases.
          </p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          <button
            type="button"
            onClick={() => onSelectMilestone(null)}
            className={cn(
              'shrink-0 rounded-lg border px-3 py-2 text-left transition-all hover:shadow-md min-w-[140px]',
              selectedMilestoneId === null
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-sm font-medium">All Tasks</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Show all tasks regardless of milestone
            </p>
          </button>

          {milestones.map((milestone) => (
            <MilestoneCard
              key={milestone._id}
              milestone={milestone}
              isSelected={selectedMilestoneId === milestone._id}
              onSelect={() => onSelectMilestone(milestone._id)}
              onEdit={() => setEditMilestone(milestone)}
              onDelete={() => handleDelete(milestone._id)}
              onStatusChange={(status) =>
                handleUpdate(milestone._id, { status })
              }
            />
          ))}
        </div>
      )}

      {editMilestone && (
        <MilestoneFormDialog
          open={!!editMilestone}
          onOpenChange={(open) => !open && setEditMilestone(null)}
          onSubmit={(data) =>
            handleUpdate(editMilestone._id, {
              title: data.title,
              description: data.description || null,
              targetDate: data.targetDate ?? null,
              color: data.color || null,
            })
          }
          initialData={{
            title: editMilestone.title,
            description: editMilestone.description,
            targetDate: editMilestone.targetDate,
            color: editMilestone.color,
          }}
          mode="edit"
        />
      )}
    </div>
  );
}

interface MilestoneCardProps {
  milestone: MilestoneWithProgress;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: MilestoneStatus) => void;
}

function MilestoneCard({
  milestone,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onStatusChange,
}: MilestoneCardProps) {
  const statusConfig = STATUS_CONFIG[milestone.status];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'group relative shrink-0 rounded-lg border px-3 py-2 text-left transition-all hover:shadow-md cursor-pointer min-w-[180px] max-w-[220px]',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className={cn('h-2 w-2 rounded-full shrink-0', getColorClass(milestone.color))}
          />
          <span className="text-sm font-medium truncate">{milestone.title}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onStatusChange('planned')}
              disabled={milestone.status === 'planned'}
            >
              <Circle className="h-3.5 w-3.5 mr-2" />
              Mark as Planned
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onStatusChange('in_progress')}
              disabled={milestone.status === 'in_progress'}
            >
              <Clock className="h-3.5 w-3.5 mr-2" />
              Mark as In Progress
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onStatusChange('completed')}
              disabled={milestone.status === 'completed'}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
              Mark as Completed
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete milestone?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete &ldquo;{milestone.title}&rdquo; and unlink all
                    associated tasks. The tasks themselves will not be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className={cn('text-[10px] px-1.5 py-0', statusConfig.badge)}>
            {statusConfig.icon}
            <span className="ml-1">{statusConfig.label}</span>
          </Badge>
          {milestone.targetDate && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(milestone.targetDate)}
            </span>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Progress</span>
            <span>
              {milestone.progress.completed}/{milestone.progress.total}
            </span>
          </div>
          <Progress
            value={Math.round(milestone.progress.percentage * 100)}
            className="h-1"
          />
        </div>
      </div>
    </div>
  );
}

interface MilestoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    targetDate?: number;
    color?: string;
  }) => Promise<void>;
  initialData?: {
    title?: string;
    description?: string;
    targetDate?: number;
    color?: string;
  };
  mode?: 'create' | 'edit';
  trigger?: React.ReactNode;
}

function MilestoneFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode = 'create',
  trigger,
}: MilestoneFormDialogProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [targetDate, setTargetDate] = useState(toDateInputValue(initialData?.targetDate));
  const [color, setColor] = useState(initialData?.color ?? 'slate');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        targetDate: parseDateValue(targetDate),
        color,
      });
      if (mode === 'create') {
        setTitle('');
        setDescription('');
        setTargetDate('');
        setColor('slate');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && mode === 'create') {
      setTitle('');
      setDescription('');
      setTargetDate('');
      setColor('slate');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Milestone' : 'Edit Milestone'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="milestone-title">Title</Label>
            <Input
              id="milestone-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., MVP Release"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone-description">Description</Label>
            <Textarea
              id="milestone-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this milestone..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="milestone-date">Target Date</Label>
              <Input
                id="milestone-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="milestone-color">Color</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger id="milestone-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MILESTONE_COLORS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn('h-3 w-3 rounded-full', c.class)} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting
                ? 'Saving...'
                : mode === 'create'
                  ? 'Create Milestone'
                  : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
