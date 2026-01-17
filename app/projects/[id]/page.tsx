'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { KanbanBoard } from '@/components/KanbanBoard';
import { MilestoneBar } from '@/app/projects/_components/MilestoneBar';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as Id<"projects">;

  const [selectedMilestoneId, setSelectedMilestoneId] = useState<Id<"milestones"> | null>(null);

  const projects = useQuery(api.projects.get, { status: 'active' });
  const milestones = useQuery(api.milestones.listByProject, { projectId });
  const project = projects?.find((p: Doc<"projects">) => p._id === projectId);
  const isCodingProject = project?.type === 'coding';

  if (projects === undefined) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  if (!project) {
    return <div className="p-8">Project not found</div>;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b bg-card px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
            {project.icon}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-6 space-y-6 overflow-auto">
        <MilestoneBar
          projectId={projectId}
          milestones={milestones}
          selectedMilestoneId={selectedMilestoneId}
          onSelectMilestone={setSelectedMilestoneId}
        />
        <KanbanBoard
          projectId={projectId}
          showFeaturePanel={isCodingProject}
          selectedMilestoneId={selectedMilestoneId}
        />
      </div>
    </div>
  );
}
