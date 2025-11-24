'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { TodoLinkDialog } from '@/components/TodoLinkDialog';
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Link as LinkIcon, ListChecks, Loader2, Plus, X } from 'lucide-react';

interface LinkedTaskEntry {
  link: Doc<'todoTaskLinks'>;
  task: Doc<'tasks'> | null;
}

export interface HydratedTodoPayload {
  todo: Doc<'todos'>;
  checklist: Doc<'todoChecklist'>[];
  links: LinkedTaskEntry[];
  progress: {
    total: number;
    completed: number;
    linkedCount: number;
    linkedDone: number;
    checklistCount: number;
    checklistDone: number;
    percentage: number;
  };
}

interface TodoCardProps {
  data: HydratedTodoPayload;
  onRequestLinking?: (todoId: Id<'todos'>) => void;
}

export function TodoCard({ data, onRequestLinking }: TodoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  const setTodoStatus = useMutation(api.todos.setTodoStatus);
  const createChecklistItem = useMutation(api.todos.createChecklistItem);
  const updateChecklistItem = useMutation(api.todos.updateChecklistItem);
  const deleteChecklistItem = useMutation(api.todos.deleteChecklistItem);
  const unlinkTask = useMutation(api.todos.unlinkTaskFromTodo);

  const progressPct = Math.round((data.progress.percentage || 0) * 100);
  const nextStatus = data.todo.status === 'todo' ? 'in_progress' : data.todo.status === 'in_progress' ? 'done' : 'todo';

  const handleToggleStatus = async () => {
    setIsSavingStatus(true);
    try {
      await setTodoStatus({ id: data.todo._id, status: nextStatus });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'CONFIRM_CASCADE') {
        const shouldCascade = window.confirm('Mark all linked subtasks and checklist items as done?');
        if (shouldCascade) {
          await setTodoStatus({ id: data.todo._id, status: 'done', cascadeChildren: true });
        }
      } else {
        console.error(error);
      }
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleAddChecklist = async () => {
    const trimmed = newChecklistTitle.trim();
    if (!trimmed) return;
    await createChecklistItem({ todoId: data.todo._id, title: trimmed });
    setNewChecklistTitle('');
    if (!isExpanded) setIsExpanded(true);
  };

  const handleChecklistToggle = async (item: Doc<'todoChecklist'>) => {
    await updateChecklistItem({ id: item._id, status: item.status === 'done' ? 'todo' : 'done' });
  };

  const handleChecklistDelete = async (item: Doc<'todoChecklist'>) => {
    if (!window.confirm('Remove this checklist item?')) return;
    await deleteChecklistItem({ id: item._id });
  };

  const handleUnlinkTask = async (taskId: Id<'tasks'>) => {
    if (!window.confirm('Unlink this task from the todo?')) return;
    await unlinkTask({ todoId: data.todo._id, taskId });
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <button
            onClick={handleToggleStatus}
            className={cn(
              'inline-flex items-center gap-2 text-left text-base font-semibold transition-colors',
              'text-slate-900 dark:text-slate-100'
            )}
            disabled={isSavingStatus}
          >
            {isSavingStatus ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            ) : data.todo.status === 'done' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : data.todo.status === 'in_progress' ? (
              <ListChecks className="h-5 w-5 text-blue-500" />
            ) : (
              <Circle className="h-5 w-5 text-slate-400" />
            )}
            <span>{data.todo.title}</span>
          </button>

          {data.todo.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{data.todo.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <Badge variant="secondary" className="uppercase tracking-wide">
              {progressPct}% done
            </Badge>
            {data.todo.pinForToday && <Badge variant="outline">Pinned</Badge>}
            {data.todo.plannedDate && (
              <span>
                Planned {new Date(data.todo.plannedDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <ProgressRing value={progressPct} />
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? (
              <>
                <ChevronUp className="mr-1 h-4 w-4" /> Hide
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-4 w-4" /> Details
              </>
            )}
          </Button>
          {onRequestLinking ? (
            <Button variant="secondary" size="sm" onClick={() => onRequestLinking(data.todo._id)}>
              <LinkIcon className="mr-2 h-4 w-4" /> Link tasks
            </Button>
          ) : (
            <TodoLinkDialog
              todoId={data.todo._id}
              trigger={
                <Button variant="secondary" size="sm">
                  <LinkIcon className="mr-2 h-4 w-4" /> Link tasks
                </Button>
              }
            />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <ListChecks className="h-4 w-4" /> Checklist ({data.progress.checklistDone}/{data.progress.checklistCount})
              </div>
            </div>

            <div className="space-y-2">
              {data.checklist.map((item) => (
                <div key={item._id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/40 p-2">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={item.status === 'done'} onCheckedChange={() => handleChecklistToggle(item)} />
                    <span className={cn('text-sm', item.status === 'done' && 'line-through text-slate-400')}>
                      {item.title}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleChecklistDelete(item)}>
                    <X className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add checklist item"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChecklist();
                    }
                  }}
                />
                <Button size="icon" onClick={handleAddChecklist}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Linked subtasks</div>
              <span className="text-xs text-slate-500">
                {data.progress.linkedDone}/{data.progress.linkedCount} complete
              </span>
            </div>

            {data.links.length === 0 ? (
              <p className="text-sm text-slate-500">No linked tasks yet.</p>
            ) : (
              <div className="space-y-2">
                {data.links.map(({ link, task }) => (
                  <div
                    key={link._id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-2"
                  >
                    <div className="flex items-center gap-3">
                      {task?.status === 'done' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : task?.status === 'in_progress' ? (
                        <ListChecks className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{task?.title || 'Task removed'}</p>
                        {task && (
                          <Link
                            href={`/projects/${task.projectId}`}
                            className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1"
                          >
                            Open project
                          </Link>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleUnlinkTask(link.taskId)}>
                      Unlink
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative h-12 w-12">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
        <circle
          className="text-slate-200 dark:text-slate-700"
          strokeWidth="4"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="24"
          cy="24"
        />
        <circle
          className="text-blue-500"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="24"
          cy="24"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-100">
        {clamped}%
      </span>
    </div>
  );
}
