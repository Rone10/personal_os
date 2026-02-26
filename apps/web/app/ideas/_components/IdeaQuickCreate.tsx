'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus } from 'lucide-react';

type IdeaQuickCreateProps = {
  onCreated?: () => void;
};

export function IdeaQuickCreate({ onCreated }: IdeaQuickCreateProps) {
  const createIdea = useMutation(api.ideas.create);
  const [title, setTitle] = useState('');
  const [problemOneLiner, setProblemOneLiner] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !problemOneLiner.trim()) return;

    setIsSaving(true);
    try {
      await createIdea({
        title: title.trim(),
        problemOneLiner: problemOneLiner.trim(),
      });
      setTitle('');
      setProblemOneLiner('');
      onCreated?.();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Quick Capture</h2>
        <p className="text-sm text-muted-foreground">Save in under 20 seconds.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="idea-title">Title</Label>
        <Input
          id="idea-title"
          placeholder="e.g. AI onboarding copilot for docs"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="idea-problem">1-line problem</Label>
        <Input
          id="idea-problem"
          placeholder="e.g. Teams waste hours writing release notes manually"
          value={problemOneLiner}
          onChange={(event) => setProblemOneLiner(event.target.value)}
          required
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Save Idea
        </Button>
      </div>
    </form>
  );
}
