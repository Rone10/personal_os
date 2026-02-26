'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useParams } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Loader2, Link2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type IdeaStatus = 'captured' | 'worth_exploring' | 'parked';

export default function IdeaDetailPage() {
  const params = useParams();
  const ideaId = params.id as Id<'ideas'>;

  const idea = useQuery(api.ideas.getById, { id: ideaId });
  const linkedProjects = useQuery(api.ideas.getLinkedProjects, { ideaId }) ?? [];
  const linkedPrompts = useQuery(api.ideas.getLinkedPrompts, { ideaId }) ?? [];
  const linkedIdeas = useQuery(api.ideas.getLinkedIdeas, { ideaId }) ?? [];

  const activeProjectsQuery = useQuery(api.projects.get, { status: 'active' });
  const ideaProjectsQuery = useQuery(api.projects.get, { status: 'idea' });
  const prompts = useQuery(api.prompts.getAll) ?? [];
  const allIdeas = useQuery(api.ideas.list, {}) ?? [];

  const updateIdea = useMutation(api.ideas.update);
  const linkProject = useMutation(api.ideas.linkProject);
  const unlinkProject = useMutation(api.ideas.unlinkProject);
  const linkPrompt = useMutation(api.ideas.linkPrompt);
  const unlinkPrompt = useMutation(api.ideas.unlinkPrompt);
  const linkIdea = useMutation(api.ideas.linkIdea);
  const unlinkIdea = useMutation(api.ideas.unlinkIdea);
  const createProjectFromIdea = useMutation(api.ideas.createProjectFromIdea);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [selectedIdeaId, setSelectedIdeaId] = useState<string>('');
  const [projectName, setProjectName] = useState('');

  const availableProjects = useMemo(() => {
    const activeProjects = activeProjectsQuery ?? [];
    const ideaProjects = ideaProjectsQuery ?? [];
    const map = new Map<string, (typeof activeProjects)[number]>();
    for (const project of [...activeProjects, ...ideaProjects]) {
      map.set(project._id, project);
    }
    return Array.from(map.values());
  }, [activeProjectsQuery, ideaProjectsQuery]);

  if (idea === undefined) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!idea) {
    return <div className="p-8">Idea not found.</div>;
  }

  async function onStatusChange(status: IdeaStatus) {
    await updateIdea({ id: ideaId, status });
  }

  async function onSaveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await updateIdea({
      id: ideaId,
      title: String(formData.get('title') ?? '').trim(),
      problemOneLiner: String(formData.get('problemOneLiner') ?? '').trim(),
      referenceUrl: String(formData.get('referenceUrl') ?? '').trim() || undefined,
      notes: String(formData.get('notes') ?? '').trim() || undefined,
    });
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Idea Detail</h1>
        <p className="text-muted-foreground">Lightweight links to projects, prompts, and related ideas.</p>
      </div>

      <form onSubmit={onSaveDetails} className="rounded-lg border bg-card p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={idea.title} required />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={idea.status} onValueChange={(value) => onStatusChange(value as IdeaStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="captured">Captured</SelectItem>
                <SelectItem value="worth_exploring">Worth Exploring</SelectItem>
                <SelectItem value="parked">Parked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="problemOneLiner">1-line problem</Label>
          <Input id="problemOneLiner" name="problemOneLiner" defaultValue={idea.problemOneLiner} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="referenceUrl">Reference URL (optional)</Label>
          <Input id="referenceUrl" name="referenceUrl" defaultValue={idea.referenceUrl ?? ''} placeholder="https://..." />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea id="notes" name="notes" defaultValue={idea.notes ?? ''} />
        </div>

        <div className="flex justify-end">
          <Button type="submit">Save Changes</Button>
        </div>
      </form>

      <section className="rounded-lg border bg-card p-4 space-y-4">
        <h2 className="text-lg font-semibold">Link to Project</h2>
        <div className="flex gap-2">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose project" />
            </SelectTrigger>
            <SelectContent>
              {availableProjects.map((project) => (
                <SelectItem key={project._id} value={project._id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={async () => {
              if (!selectedProjectId) return;
              await linkProject({ ideaId, projectId: selectedProjectId as Id<'projects'> });
              setSelectedProjectId('');
            }}
          >
            <Link2 className="mr-2 h-4 w-4" /> Link
          </Button>
        </div>

        <div className="space-y-2">
          {linkedProjects.map((project) => (
            <div key={project._id} className="flex items-center justify-between rounded border p-2">
              <span>{project.name}</span>
              <Button variant="outline" size="sm" onClick={() => unlinkProject({ ideaId, projectId: project._id })}>Unlink</Button>
            </div>
          ))}
          {linkedProjects.length === 0 ? <p className="text-sm text-muted-foreground">No linked projects yet.</p> : null}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 space-y-4">
        <h2 className="text-lg font-semibold">Link to Prompt</h2>
        <div className="flex gap-2">
          <Select value={selectedPromptId} onValueChange={setSelectedPromptId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose prompt" />
            </SelectTrigger>
            <SelectContent>
              {prompts.map((prompt) => (
                <SelectItem key={prompt._id} value={prompt._id}>{prompt.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={async () => {
              if (!selectedPromptId) return;
              await linkPrompt({ ideaId, promptId: selectedPromptId as Id<'prompts'> });
              setSelectedPromptId('');
            }}
          >
            <Link2 className="mr-2 h-4 w-4" /> Link
          </Button>
        </div>

        <div className="space-y-2">
          {linkedPrompts.map((prompt) => (
            <div key={prompt._id} className="flex items-center justify-between rounded border p-2">
              <span>{prompt.title}</span>
              <Button variant="outline" size="sm" onClick={() => unlinkPrompt({ ideaId, promptId: prompt._id })}>Unlink</Button>
            </div>
          ))}
          {linkedPrompts.length === 0 ? <p className="text-sm text-muted-foreground">No linked prompts yet.</p> : null}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 space-y-4">
        <h2 className="text-lg font-semibold">Link to Related Idea</h2>
        <div className="flex gap-2">
          <Select value={selectedIdeaId} onValueChange={setSelectedIdeaId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose related idea" />
            </SelectTrigger>
            <SelectContent>
              {allIdeas
                .filter((candidate) => candidate._id !== ideaId)
                .map((candidate) => (
                  <SelectItem key={candidate._id} value={candidate._id}>{candidate.title}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={async () => {
              if (!selectedIdeaId) return;
              await linkIdea({ fromIdeaId: ideaId, toIdeaId: selectedIdeaId as Id<'ideas'> });
              setSelectedIdeaId('');
            }}
          >
            <Link2 className="mr-2 h-4 w-4" /> Link
          </Button>
        </div>

        <div className="space-y-2">
          {linkedIdeas.map((linked) => (
            <div key={linked._id} className="flex items-center justify-between rounded border p-2">
              <span>{linked.title}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => unlinkIdea({ fromIdeaId: ideaId, toIdeaId: linked._id })}
              >
                Unlink
              </Button>
            </div>
          ))}
          {linkedIdeas.length === 0 ? <p className="text-sm text-muted-foreground">No linked ideas yet.</p> : null}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="text-lg font-semibold">Create Project from Idea</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Project name"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
          />
          <Button
            type="button"
            onClick={async () => {
              const name = projectName.trim();
              if (!name) return;
              await createProjectFromIdea({ ideaId, projectName: name });
              setProjectName('');
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Create
          </Button>
        </div>
      </section>
    </div>
  );
}
