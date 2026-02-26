'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Loader2, Lightbulb, FolderKanban, LayoutGrid, Table2 } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { IdeaQuickCreate } from './_components/IdeaQuickCreate';
import { IdeasList } from './_components/IdeasList';
import { IdeasTable } from './_components/IdeasTable';
import { ProjectCard } from '@/components/ProjectCard';
import { Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type IdeaStatus = 'captured' | 'worth_exploring' | 'parked';
type IdeasViewMode = 'kanban' | 'table';

export default function IdeasPage() {
  const ideas = useQuery(api.ideas.list, {});
  const setIdea = useMutation(api.ideas.update);
  const [viewMode, setViewMode] = useState<IdeasViewMode>('kanban');

  const ideaProjects = useQuery(api.projects.get, { status: 'idea' }) ?? [];
  const activeProjects = useQuery(api.projects.get, { status: 'active' }) ?? [];
  const doneProjects = useQuery(api.projects.get, { status: 'archived' }) ?? [];

  async function onStatusChange(id: Id<'ideas'>, status: IdeaStatus) {
    await setIdea({ id, status });
  }

  if (ideas === undefined) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          <p className="text-sm text-muted-foreground">Loading ideas…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-10">
      {/* Page Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-amber-400/10 mt-0.5">
          <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ideas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Capture fast. Link to projects and prompts. Let nothing slip away.
          </p>
        </div>
      </div>

      {/* Quick Capture Zone */}
      <IdeaQuickCreate />

      {/* Ideas Views */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Ideas Vault</h2>
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as IdeasViewMode)}>
            <TabsList>
              <TabsTrigger value="kanban">
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="table">
                <Table2 className="h-4 w-4" />
                Table
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {viewMode === 'kanban' ? (
          <IdeasList ideas={ideas} onStatusChange={onStatusChange} />
        ) : (
          <IdeasTable ideas={ideas} onStatusChange={onStatusChange} />
        )}
      </section>

      {/* Projects Pipeline */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight">Projects Pipeline</h2>
          </div>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              label: 'Idea',
              projects: ideaProjects,
              empty: 'No idea-stage projects',
              dotClass: 'bg-amber-500 dark:bg-amber-400',
            },
            {
              label: 'Active',
              projects: activeProjects,
              empty: 'No active projects',
              dotClass: 'bg-emerald-500 dark:bg-emerald-400',
            },
            {
              label: 'Archived',
              projects: doneProjects,
              empty: 'No archived projects',
              dotClass: 'bg-slate-400 dark:bg-slate-500',
            },
          ].map((col) => (
            <div key={col.label} className="rounded-xl border bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b">
                <span className={`h-2 w-2 rounded-full ${col.dotClass}`} />
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <Badge variant="outline" className="ml-auto text-[11px] font-mono tabular-nums">
                  {col.projects.length}
                </Badge>
              </div>
              <div className="space-y-2.5 p-3">
                {col.projects.map((project) => (
                  <ProjectCard key={project._id} project={project} />
                ))}
                {col.projects.length === 0 ? (
                  <div className="flex items-center justify-center rounded-lg border border-dashed py-6">
                    <p className="text-sm text-muted-foreground/60">{col.empty}</p>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
