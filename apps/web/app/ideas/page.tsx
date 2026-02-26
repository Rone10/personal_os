'use client';

import { useMutation, useQuery } from 'convex/react';
import { Loader2 } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { IdeaQuickCreate } from './_components/IdeaQuickCreate';
import { IdeasList } from './_components/IdeasList';
import { ProjectCard } from '@/components/ProjectCard';
import { Id } from '@/convex/_generated/dataModel';

type IdeaStatus = 'captured' | 'worth_exploring' | 'parked';

export default function IdeasPage() {
  const ideas = useQuery(api.ideas.list, {});
  const setIdea = useMutation(api.ideas.update);

  const ideaProjects = useQuery(api.projects.get, { status: 'idea' }) ?? [];
  const activeProjects = useQuery(api.projects.get, { status: 'active' }) ?? [];
  const doneProjects = useQuery(api.projects.get, { status: 'archived' }) ?? [];

  async function onStatusChange(id: Id<'ideas'>, status: IdeaStatus) {
    await setIdea({ id, status });
  }

  if (ideas === undefined) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ideas</h1>
        <p className="text-muted-foreground">Capture ideas fast and keep lightweight links to projects and prompts.</p>
      </div>

      <IdeaQuickCreate />

      <IdeasList ideas={ideas} onStatusChange={onStatusChange} />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Projects by Status</h2>
          <p className="text-sm text-muted-foreground">Simple kanban view of execution state.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-3">
            <h3 className="mb-3 font-medium">Idea</h3>
            <div className="space-y-3">
              {ideaProjects.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
              {ideaProjects.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No idea-stage projects.</div>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-3">
            <h3 className="mb-3 font-medium">Active</h3>
            <div className="space-y-3">
              {activeProjects.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
              {activeProjects.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No active projects.</div>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-3">
            <h3 className="mb-3 font-medium">Done/Archived</h3>
            <div className="space-y-3">
              {doneProjects.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
              {doneProjects.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No archived projects.</div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
