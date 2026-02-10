'use client';

import { ReactNode, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle } from 'lucide-react';

interface TodoLinkDialogProps {
  todoId: Id<'todos'>;
  trigger: ReactNode;
  onLinked?: () => void;
}

export function TodoLinkDialog({ todoId, trigger, onLinked }: TodoLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<Id<'tasks'>>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('todo');
  const [search, setSearch] = useState('');

  const projects = useQuery(api.projects.get, { status: 'active' });
  const args = useMemo(() => {
    const projectId = projectFilter === 'all' ? undefined : (projectFilter as Id<'projects'>);
    const status = statusFilter === 'all' ? undefined : (statusFilter as 'todo' | 'in_progress' | 'done');
    const query = search.trim() || undefined;
    return { projectId, status, search: query } as {
      projectId?: Id<'projects'>;
      status?: 'todo' | 'in_progress' | 'done';
      search?: string;
    };
  }, [projectFilter, statusFilter, search]);

  const tasks = useQuery(api.tasks.listForLinking, args);
  const linkTask = useMutation(api.todos.linkTaskToTodo);
  const relinkTask = useMutation(api.todos.relinkTask);

  const toggle = (taskId: Id<'tasks'>) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleLink = async () => {
    if (selected.size === 0) return;
    setIsSubmitting(true);
    setWarning(null);

    try {
      for (const taskId of selected) {
        try {
          await linkTask({ todoId, taskId });
        } catch (error) {
          if (error instanceof Error && error.message === 'TASK_ALREADY_LINKED') {
            const shouldRelink = window.confirm('Task already has a parent todo. Move it here?');
            if (shouldRelink) {
              await relinkTask({ targetTodoId: todoId, taskId });
            } else {
              setWarning('Skipped at least one task because it is already linked elsewhere.');
            }
          } else {
            throw error;
          }
        }
      }

      setSelected(new Set());
      setOpen(false);
      onLinked?.();
    } catch (error) {
      console.error(error);
      setWarning('Unable to complete linking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link project tasks</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>Select tasks to attach to this todo</span>
            <Badge variant="outline">{selected.size} selected</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project._id} value={project._id as string}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="todo">Todo</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>

            <Input placeholder="Search title" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <ScrollArea className="max-h-64 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {tasks?.length ? (
                tasks.map((task) => (
                  <label key={task._id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={selected.has(task._id)} onCheckedChange={() => toggle(task._id)} />
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <span className="text-xs text-slate-500">{task.status}</span>
                      </div>
                    </div>
                  </label>
                ))
              ) : (
                <p className="p-4 text-sm text-slate-500">No tasks available to link.</p>
              )}
            </div>
          </ScrollArea>

          {warning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleLink} disabled={isSubmitting || selected.size === 0}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Link selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
