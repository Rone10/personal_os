'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  Loader2,
  Link2,
  ArrowLeft,
  Lightbulb,
  FolderOpen,
  Sparkles,
  GitBranch,
  Rocket,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type IdeaStatus = 'captured' | 'worth_exploring' | 'parked';

const statusConfig: Record<
  IdeaStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  captured: {
    label: 'Captured',
    dotClass: 'bg-amber-500',
    badgeClass:
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  worth_exploring: {
    label: 'Worth Exploring',
    dotClass: 'bg-emerald-500',
    badgeClass:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  parked: {
    label: 'Parked',
    dotClass: 'bg-slate-400',
    badgeClass:
      'bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-400/20',
  },
};

export default function IdeaDetailPage() {
  const params = useParams();
  const ideaId = params.id as Id<'ideas'>;

  const idea = useQuery(api.ideas.getById, { id: ideaId });
  const linkedProjects =
    useQuery(api.ideas.getLinkedProjects, { ideaId }) ?? [];
  const linkedPrompts = useQuery(api.ideas.getLinkedPrompts, { ideaId }) ?? [];
  const linkedIdeasQuery = useQuery(api.ideas.getLinkedIdeas, { ideaId });
  const linkedIdeas = linkedIdeasQuery ?? [];

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

  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    undefined,
  );
  const [selectedPromptId, setSelectedPromptId] = useState<string | undefined>(
    undefined,
  );
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | undefined>(
    undefined,
  );
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

  const linkedIdeaIdSet = new Set(linkedIdeas.map((linked) => linked._id));

  if (idea === undefined) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          <p className="text-sm text-muted-foreground">Loading idea…</p>
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium">Idea not found</p>
          <Link
            href="/ideas"
            className="mt-2 inline-block text-sm text-amber-600 dark:text-amber-400 hover:underline"
          >
            ← Back to Ideas
          </Link>
        </div>
      </div>
    );
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
      referenceUrl:
        String(formData.get('referenceUrl') ?? '').trim() || undefined,
      notes: String(formData.get('notes') ?? '').trim() || undefined,
    });
  }

  const config = statusConfig[idea.status as IdeaStatus];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Breadcrumb + Header */}
      <div>
        <Link
          href="/ideas"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Ideas
        </Link>

        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-amber-400/10 mt-0.5">
            <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {idea.title}
              </h1>
              {config && (
                <Badge
                  variant="outline"
                  className={cn('shrink-0', config.badgeClass)}
                >
                  <span
                    className={cn(
                      'mr-1.5 h-1.5 w-1.5 rounded-full',
                      config.dotClass,
                    )}
                  />
                  {config.label}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {idea.problemOneLiner}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Details Form */}
      <form
        onSubmit={onSaveDetails}
        className="rounded-xl border bg-card/50 backdrop-blur-sm p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
          Details
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="title"
              className="text-xs font-medium text-muted-foreground"
            >
              Title
            </Label>
            <Input
              id="title"
              name="title"
              defaultValue={idea.title}
              required
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Status
            </Label>
            <Select
              value={idea.status}
              onValueChange={(value) => onStatusChange(value as IdeaStatus)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="captured">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Captured
                  </span>
                </SelectItem>
                <SelectItem value="worth_exploring">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Worth Exploring
                  </span>
                </SelectItem>
                <SelectItem value="parked">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Parked
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="problemOneLiner"
            className="text-xs font-medium text-muted-foreground"
          >
            Problem
          </Label>
          <Input
            id="problemOneLiner"
            name="problemOneLiner"
            defaultValue={idea.problemOneLiner}
            required
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="referenceUrl"
            className="text-xs font-medium text-muted-foreground"
          >
            Reference URL
          </Label>
          <Input
            id="referenceUrl"
            name="referenceUrl"
            defaultValue={idea.referenceUrl ?? ''}
            placeholder="https://..."
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="notes"
            className="text-xs font-medium text-muted-foreground"
          >
            Notes
          </Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={idea.notes ?? ''}
            className="min-h-[100px] text-sm"
          />
        </div>

        <div className="flex justify-end pt-1">
          <Button type="submit" size="sm">
            Save Changes
          </Button>
        </div>
      </form>

      {/* Links Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Linked Projects */}
        <section className="rounded-xl border bg-card/50 backdrop-blur-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
              Projects
            </h2>
            <Badge
              variant="outline"
              className="ml-auto text-[11px] font-mono"
            >
              {linkedProjects.length}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Choose project" />
              </SelectTrigger>
              <SelectContent>
                {availableProjects.map((project) => (
                  <SelectItem key={project._id} value={project._id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0"
              disabled={!selectedProjectId}
              onClick={async () => {
                if (!selectedProjectId) return;
                try {
                  await linkProject({
                    ideaId,
                    projectId: selectedProjectId as Id<'projects'>,
                  });
                  toast.success('Project linked to idea');
                  setSelectedProjectId(undefined);
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : 'Failed to link project';
                  toast.error(message);
                }
              }}
            >
              <Link2 className="mr-1.5 h-3 w-3" /> Save Link
            </Button>
          </div>

          <div className="space-y-1.5">
            {linkedProjects.map((project) => (
              <div
                key={project._id}
                className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 group"
              >
                <span className="text-sm">{project.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    unlinkProject({ ideaId, projectId: project._id })
                  }
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {linkedProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 py-3 text-center">
                No linked projects
              </p>
            ) : null}
          </div>
        </section>

        {/* Linked Prompts */}
        <section className="rounded-xl border bg-card/50 backdrop-blur-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
              Prompts
            </h2>
            <Badge
              variant="outline"
              className="ml-auto text-[11px] font-mono"
            >
              {linkedPrompts.length}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Select
              value={selectedPromptId}
              onValueChange={setSelectedPromptId}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Choose prompt" />
              </SelectTrigger>
              <SelectContent>
                {prompts.map((prompt) => (
                  <SelectItem key={prompt._id} value={prompt._id}>
                    {prompt.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0"
              disabled={!selectedPromptId}
              onClick={async () => {
                if (!selectedPromptId) return;
                try {
                  await linkPrompt({
                    ideaId,
                    promptId: selectedPromptId as Id<'prompts'>,
                  });
                  toast.success('Prompt linked to idea');
                  setSelectedPromptId(undefined);
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : 'Failed to link prompt';
                  toast.error(message);
                }
              }}
            >
              <Link2 className="mr-1.5 h-3 w-3" /> Save Link
            </Button>
          </div>

          <div className="space-y-1.5">
            {linkedPrompts.map((prompt) => (
              <div
                key={prompt._id}
                className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 group"
              >
                <span className="text-sm">{prompt.title}</span>
                <button
                  type="button"
                  onClick={() =>
                    unlinkPrompt({ ideaId, promptId: prompt._id })
                  }
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {linkedPrompts.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 py-3 text-center">
                No linked prompts
              </p>
            ) : null}
          </div>
        </section>

        {/* Linked Ideas */}
        <section className="rounded-xl border bg-card/50 backdrop-blur-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
              Related Ideas
            </h2>
            <Badge
              variant="outline"
              className="ml-auto text-[11px] font-mono"
            >
              {linkedIdeas.length}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Select value={selectedIdeaId} onValueChange={setSelectedIdeaId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Choose related idea" />
              </SelectTrigger>
              <SelectContent>
                {allIdeas
                  .filter(
                    (candidate) =>
                      candidate._id !== ideaId &&
                      !linkedIdeaIdSet.has(candidate._id),
                  )
                  .map((candidate) => (
                    <SelectItem key={candidate._id} value={candidate._id}>
                      {candidate.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0"
              disabled={!selectedIdeaId}
              onClick={async () => {
                if (!selectedIdeaId) return;
                try {
                  await linkIdea({
                    fromIdeaId: ideaId,
                    toIdeaId: selectedIdeaId as Id<'ideas'>,
                  });
                  toast.success('Related idea linked successfully');
                  setSelectedIdeaId(undefined);
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : 'Failed to link idea';
                  toast.error(message);
                }
              }}
            >
              <Link2 className="mr-1.5 h-3 w-3" /> Save Link
            </Button>
          </div>

          <div className="space-y-1.5">
            {linkedIdeas.map((linked) => (
              <div
                key={linked._id}
                className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 group"
              >
                <Link
                  href={`/ideas/${linked._id}`}
                  className="text-sm hover:underline"
                >
                  {linked.title}
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    unlinkIdea({ fromIdeaId: ideaId, toIdeaId: linked._id })
                  }
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {linkedIdeas.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 py-3 text-center">
                No related ideas
              </p>
            ) : null}
          </div>
        </section>

        {/* Create Project from Idea */}
        <section className="rounded-xl border border-dashed border-amber-500/20 dark:border-amber-400/15 bg-card/50 backdrop-blur-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
              Promote to Project
            </h2>
          </div>

          <p className="text-xs text-muted-foreground">
            Turn this idea into an active project.
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="Project name"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              className="h-8 text-sm"
            />
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white"
              onClick={async () => {
                const name = projectName.trim();
                if (!name) return;
                await createProjectFromIdea({ ideaId, projectName: name });
                setProjectName('');
              }}
            >
              <Rocket className="mr-1.5 h-3 w-3" /> Create
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
