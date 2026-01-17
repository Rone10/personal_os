'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Plus,
  Trash2,
  CheckSquare,
} from 'lucide-react';
import { toast } from 'sonner';

interface SubtaskListProps {
  taskId: Id<'tasks'>;
  compact?: boolean;
}

export function SubtaskList({ taskId, compact = false }: SubtaskListProps) {
  const subtasks = useQuery(api.subtasks.listByTask, { taskId });
  const createSubtask = useMutation(api.subtasks.create);
  const toggleSubtask = useMutation(api.subtasks.toggle);
  const removeSubtask = useMutation(api.subtasks.remove);

  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await createSubtask({ taskId, title: newTitle.trim() });
      setNewTitle('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to add subtask');
    }
  };

  const handleToggle = async (subtaskId: Id<'subtasks'>) => {
    try {
      await toggleSubtask({ subtaskId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to toggle subtask');
    }
  };

  const handleDelete = async (subtaskId: Id<'subtasks'>) => {
    try {
      await removeSubtask({ subtaskId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete subtask');
    }
  };

  if (subtasks === undefined) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-6 w-full bg-slate-100 dark:bg-slate-900 rounded" />
        <div className="h-6 w-full bg-slate-100 dark:bg-slate-900 rounded" />
      </div>
    );
  }

  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.status === 'done').length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  if (compact) {
    return <SubtaskListCompact subtasks={subtasks} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Subtasks
          </span>
          {total > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {completed}/{total}
            </span>
          )}
        </div>
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>

      {total > 0 && (
        <Progress value={percentage} className="h-1" />
      )}

      <div className="space-y-1">
        {subtasks.map((subtask) => (
          <SubtaskRow
            key={subtask._id}
            subtask={subtask}
            onToggle={() => handleToggle(subtask._id)}
            onDelete={() => handleDelete(subtask._id)}
          />
        ))}
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a subtask..."
            className="h-8 text-sm"
            onBlur={() => {
              if (!newTitle.trim()) {
                setIsAdding(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setNewTitle('');
                setIsAdding(false);
              }
            }}
          />
          <Button type="submit" size="sm" className="h-8">
            Add
          </Button>
        </form>
      )}

      {!isAdding && total === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No subtasks yet. Click &ldquo;Add&rdquo; to create one.
        </p>
      )}
    </div>
  );
}

interface SubtaskRowProps {
  subtask: Doc<'subtasks'>;
  onToggle: () => void;
  onDelete: () => void;
}

function SubtaskRow({ subtask, onToggle, onDelete }: SubtaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(subtask.title);
  const updateSubtask = useMutation(api.subtasks.update);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === subtask.title) {
      setEditTitle(subtask.title);
      setIsEditing(false);
      return;
    }

    try {
      await updateSubtask({ subtaskId: subtask._id, title: trimmed });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update subtask');
      setEditTitle(subtask.title);
    }
  };

  return (
    <div className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-slate-50 dark:hover:bg-slate-900/50">
      <Checkbox
        checked={subtask.status === 'done'}
        onCheckedChange={onToggle}
        className="h-4 w-4"
      />

      {isEditing ? (
        <form
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <Input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="h-6 text-sm"
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditTitle(subtask.title);
                setIsEditing(false);
              }
            }}
          />
        </form>
      ) : (
        <span
          className={cn(
            'flex-1 text-sm cursor-pointer',
            subtask.status === 'done' && 'text-muted-foreground line-through'
          )}
          onClick={() => setIsEditing(true)}
        >
          {subtask.title}
        </span>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

interface SubtaskListCompactProps {
  subtasks: Doc<'subtasks'>[];
}

function SubtaskListCompact({ subtasks }: SubtaskListCompactProps) {
  if (subtasks.length === 0) return null;

  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.status === 'done').length;

  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
      <CheckSquare className="h-3 w-3" />
      <span>
        {completed}/{total} subtasks
      </span>
      <Progress value={(completed / total) * 100} className="h-1 w-12" />
    </div>
  );
}

// Separate component for inline progress display on task cards
interface SubtaskProgressBadgeProps {
  taskId: Id<'tasks'>;
}

export function SubtaskProgressBadge({ taskId }: SubtaskProgressBadgeProps) {
  const progress = useQuery(api.subtasks.getSubtaskProgress, { taskId });

  if (!progress || progress.total === 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <CheckSquare className="h-3 w-3" />
      <span>
        {progress.completed}/{progress.total}
      </span>
      <Progress
        value={Math.round(progress.percentage * 100)}
        className="h-1 w-10"
      />
    </div>
  );
}

// Hook for getting subtask progress in parent components
export function useSubtaskProgress(taskIds: Id<'tasks'>[]) {
  return useQuery(api.subtasks.getSubtaskProgressBatch, { taskIds });
}
