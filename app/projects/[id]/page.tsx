'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { KanbanBoard } from '@/components/KanbanBoard';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as Id<"projects">;
  
  // We don't have a getById for projects yet, but we can use get and filter or add a getById.
  // For now, let's add a getById to convex/projects.ts or just use get and find.
  // Actually, `db.get` is available in mutations/queries if we expose it.
  // Let's assume we need to add `getById` to `convex/projects.ts` for efficiency, 
  // or just use `api.projects.get` and find it client side (not ideal but works for small data).
  // Better: Add `getById` to `convex/projects.ts`.
  
  // Wait, I can't edit `convex/projects.ts` right now easily without interrupting flow.
  // I'll use `api.projects.get` and filter for now.
  const projects = useQuery(api.projects.get, { status: 'active' });
  const project = projects?.find((p: Doc<"projects">) => p._id === projectId);
  const isCodingProject = project?.type === 'coding';

  if (projects === undefined) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  if (!project) {
    return <div className="p-8">Project not found</div>;
  }

  return (
    <div className="flex flex-col h-full p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{project.icon}</span>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        </div>
        <p className="text-muted-foreground">{project.description}</p>
      </div>

      <div className="flex-1 min-h-0">
        <KanbanBoard projectId={projectId} showFeaturePanel={isCodingProject} />
      </div>
    </div>
  );
}
