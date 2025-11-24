'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, AlertTriangle } from 'lucide-react';

interface TodoQuickCreateProps {
  onCreated?: () => void;
}

export function TodoQuickCreate({ onCreated }: TodoQuickCreateProps) {
  const [title, setTitle] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    plannedDate: '',
    pinForToday: true,
    checklistSeed: '',
  });
  const [selectedTasks, setSelectedTasks] = useState<Set<Id<'tasks'>>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkWarning, setLinkWarning] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('todo');
  const [search, setSearch] = useState('');

  const projects = useQuery(api.projects.get, { status: 'active' });
  const linkingArgs = useMemo(() => {
    const projectId = projectFilter === 'all' ? undefined : (projectFilter as Id<'projects'>);
    const status = statusFilter === 'all' ? undefined : (statusFilter as 'todo' | 'in_progress' | 'done');
    const searchTerm = search.trim() || undefined;
    return { projectId, status, search: searchTerm } as {
      projectId?: Id<'projects'>;
      status?: 'todo' | 'in_progress' | 'done';
      search?: string;
    };
  }, [projectFilter, statusFilter, search]);

  const tasks = useQuery(api.tasks.listForLinking, linkingArgs);

  const createTodo = useMutation(api.todos.createTodo);
  const createChecklistItem = useMutation(api.todos.createChecklistItem);
  const linkTaskToTodo = useMutation(api.todos.linkTaskToTodo);
  const relinkTask = useMutation(api.todos.relinkTask);

  const quickAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    await createTodo({ title: trimmed, pinForToday: true });
    setTitle('');
    onCreated?.();
  };

  const toggleTaskSelection = (taskId: Id<'tasks'>) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const selectableTasks = useMemo(() => tasks || [], [tasks]);

  const handleAdvancedSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setLinkWarning(null);

    try {
      const plannedDate = formState.plannedDate ? new Date(formState.plannedDate).getTime() : undefined;
      const todoId = await createTodo({
        title: formState.title.trim() || 'Untitled Todo',
        description: formState.description || undefined,
        plannedDate,
        pinForToday: formState.pinForToday,
      });

      const checklistItems = formState.checklistSeed
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (checklistItems.length) {
        await Promise.all(checklistItems.map((item) => createChecklistItem({ todoId, title: item })));
      }

      if (selectedTasks.size > 0) {
        for (const taskId of selectedTasks) {
          try {
            await linkTaskToTodo({ todoId, taskId });
          } catch (error) {
            if (error instanceof Error && error.message === 'TASK_ALREADY_LINKED') {
              const shouldRelink = window.confirm(
                'One of the selected tasks already belongs to a different todo. Re-link it here?'
              );
              if (shouldRelink) {
                await relinkTask({ targetTodoId: todoId, taskId });
              } else {
                setLinkWarning('Skipped linking a task because it was already attached to another todo.');
              }
            } else {
              throw error;
            }
          }
        }
      }

      setFormState({ title: '', description: '', plannedDate: '', pinForToday: true, checklistSeed: '' });
      setSelectedTasks(new Set());
      setDialogOpen(false);
      onCreated?.();
    } catch (error) {
      console.error(error);
      setLinkWarning('Unable to finish creation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Quick add todo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              quickAdd();
            }
          }}
        />
        <Button onClick={quickAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Advanced</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Todo</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAdvancedSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="todo-title">Title</Label>
                  <Input
                    id="todo-title"
                    value={formState.title}
                    onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="todo-description">Description</Label>
                  <Textarea
                    id="todo-description"
                    value={formState.description}
                    onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Planned date</Label>
                    <Input
                      type="date"
                      value={formState.plannedDate}
                      onChange={(e) => setFormState((prev) => ({ ...prev, plannedDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Checkbox
                        checked={formState.pinForToday}
                        onCheckedChange={(checked) =>
                          setFormState((prev) => ({ ...prev, pinForToday: Boolean(checked) }))
                        }
                      />
                      Pin to Today
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Checklist seed (one line per item)</Label>
                  <Textarea
                    placeholder={'Design review\nPrep release notes'}
                    value={formState.checklistSeed}
                    onChange={(e) => setFormState((prev) => ({ ...prev, checklistSeed: e.target.value }))}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Link existing subtasks</Label>
                    <Badge variant="outline">{selectedTasks.size} selected</Badge>
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

                    <Input
                      placeholder="Search title"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                    {selectableTasks?.length ? (
                      selectableTasks.map((task) => (
                        <label key={task._id} className="flex items-center justify-between gap-3 text-sm">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedTasks.has(task._id)}
                              onCheckedChange={() => toggleTaskSelection(task._id)}
                            />
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <span className="text-xs text-slate-500">{task.status}</span>
                            </div>
                          </div>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No in-flight project tasks available.</p>
                    )}
                  </div>
                </div>

                {linkWarning && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Heads up</AlertTitle>
                    <AlertDescription>{linkWarning}</AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Todo
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
