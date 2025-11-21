'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface KanbanBoardProps {
  projectId: Id<"projects">;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const tasks = useQuery(api.tasks.getByProject, { projectId });
  const createTask = useMutation(api.tasks.create);
  const toggleTask = useMutation(api.tasks.toggle);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');

  if (tasks === undefined) {
    return <div className="animate-pulse h-64 bg-slate-100 dark:bg-slate-900 rounded-lg" />;
  }

  const columns = {
    todo: tasks.filter((t: Doc<"tasks">) => t.status === 'todo'),
    in_progress: tasks.filter((t: Doc<"tasks">) => t.status === 'in_progress'),
    done: tasks.filter((t: Doc<"tasks">) => t.status === 'done'),
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    await createTask({
      title: newTaskTitle,
      projectId,
      priority: 1,
    });
    
    setNewTaskTitle('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
      {/* TODO Column */}
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
        <h3 className="font-semibold mb-4 flex items-center justify-between">
          To Do
          <span className="bg-slate-200 dark:bg-slate-800 text-xs px-2 py-1 rounded-full">{columns.todo.length}</span>
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {columns.todo.map((task: Doc<"tasks">) => (
            <div key={task._id} className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-sm font-medium">{task.title}</p>
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => toggleTask({ id: task._id })}>
                  Start
                </Button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleCreateTask} className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex gap-2">
            <Input 
              placeholder="Add task..." 
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* IN PROGRESS Column */}
      <div className="flex flex-col h-full bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-4">
        <h3 className="font-semibold mb-4 flex items-center justify-between text-blue-700 dark:text-blue-400">
          In Progress
          <span className="bg-blue-100 dark:bg-blue-900/30 text-xs px-2 py-1 rounded-full">{columns.in_progress.length}</span>
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {columns.in_progress.map((task: Doc<"tasks">) => (
            <div key={task._id} className="bg-white dark:bg-slate-900 p-3 rounded border border-blue-200 dark:border-blue-800 shadow-sm">
              <p className="text-sm font-medium">{task.title}</p>
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => toggleTask({ id: task._id })}>
                  Done
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DONE Column */}
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 opacity-75">
        <h3 className="font-semibold mb-4 flex items-center justify-between">
          Done
          <span className="bg-slate-200 dark:bg-slate-800 text-xs px-2 py-1 rounded-full">{columns.done.length}</span>
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {columns.done.map((task: Doc<"tasks">) => (
            <div key={task._id} className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-sm font-medium line-through text-slate-500">{task.title}</p>
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => toggleTask({ id: task._id })}>
                  Undo
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
