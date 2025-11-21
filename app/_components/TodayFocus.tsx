'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Doc } from '@/convex/_generated/dataModel';

export function TodayFocus() {
  const tasks = useQuery(api.tasks.getToday);
  const toggleTask = useMutation(api.tasks.toggle);

  if (tasks === undefined) {
    return <div className="animate-pulse h-48 bg-slate-100 dark:bg-slate-900 rounded-lg" />;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-blue-500" />
        Today&apos;s Focus
      </h2>
      
      {tasks.length === 0 ? (
        <p className="text-slate-500 text-sm">No tasks due today. Enjoy your freedom!</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: Doc<"tasks">) => (
            <div
              key={task._id}
              className="flex items-start gap-3 group"
            >
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
                <p className={cn(
                  "text-sm font-medium",
                  task.status === 'done' && "line-through text-slate-500"
                )}>
                  {task.title}
                </p>
                {task.projectId && (
                  <span className="text-xs text-slate-400">Project ID: {task.projectId}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
