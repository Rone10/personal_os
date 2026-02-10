'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { CheckCircle2, Circle, Clock, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Doc } from '@/convex/_generated/dataModel';
import { TodoCard } from '@/components/TodoCard';
import { TodoQuickCreate } from '@/components/TodoQuickCreate';

export function TodayFocus() {
  const tasks = useQuery(api.tasks.getToday);
  const toggleTask = useMutation(api.tasks.toggle);
  const todos = useQuery(api.todos.getTodayTodos);

  if (tasks === undefined || todos === undefined) {
    return <div className="animate-pulse h-48 bg-slate-100 dark:bg-slate-900 rounded-lg" />;
  }

  const hasTasks = tasks.length > 0;
  const hasTodos = todos.length > 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          Today&apos;s Focus
        </h2>
        <TodoQuickCreate />
      </div>

      <section className="space-y-3">
        <header className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <ListChecks className="h-4 w-4" />
          Personal Todos
        </header>
        {hasTodos ? (
          <div className="space-y-4">
            {todos.map((todo) => (
              <TodoCard key={todo.todo._id} data={todo} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No personal todos scheduled today.</p>
        )}
      </section>

      <section className="space-y-3">
        <header className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <Clock className="h-4 w-4" />
          Project Tasks
        </header>
        {hasTasks ? (
          <div className="space-y-3">
            {tasks.map((task: Doc<'tasks'>) => (
              <div key={task._id} className="flex items-start gap-3 group">
                <button
                  onClick={() => toggleTask({ id: task._id })}
                  className="mt-0.5 text-slate-400 hover:text-blue-500 transition-colors"
                >
                  {task.status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <div className="flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      task.status === 'done' && 'line-through text-slate-500'
                    )}
                  >
                    {task.title}
                  </p>
                  {task.projectId && (
                    <span className="text-xs text-slate-400">Project ID: {task.projectId}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No project work due today.</p>
        )}
      </section>
    </div>
  );
}
