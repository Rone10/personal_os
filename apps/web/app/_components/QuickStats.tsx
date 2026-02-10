'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { FolderKanban, Bug, Terminal } from 'lucide-react';

export function QuickStats() {
  const projects = useQuery(api.projects.get, { status: 'active' });
  const bugs = useQuery(api.bugs.get);
  const prompts = useQuery(api.prompts.getAll);

  if (!projects || !bugs || !prompts) {
    return <div className="animate-pulse h-32 bg-slate-100 dark:bg-slate-900 rounded-lg" />;
  }

  const activeProjects = projects.length;
  const openBugs = bugs.filter((b: Doc<"bugs">) => b.status === 'open').length;
  const totalPrompts = prompts.length;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2">
        <FolderKanban className="h-6 w-6 text-slate-400" />
        <span className="text-2xl font-bold">{activeProjects}</span>
        <span className="text-xs text-slate-500">Active Projects</span>
      </div>
      
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2">
        <Bug className="h-6 w-6 text-orange-500" />
        <span className="text-2xl font-bold">{openBugs}</span>
        <span className="text-xs text-slate-500">Open Bugs</span>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2">
        <Terminal className="h-6 w-6 text-purple-500" />
        <span className="text-2xl font-bold">{totalPrompts}</span>
        <span className="text-xs text-slate-500">Prompts</span>
      </div>
    </div>
  );
}
