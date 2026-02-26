'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Zap, Keyboard } from 'lucide-react';

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
    <form
      onSubmit={onSubmit}
      className="relative overflow-hidden rounded-xl border border-amber-500/20 dark:border-amber-400/15 bg-gradient-to-br from-amber-50/50 via-background to-background dark:from-amber-950/20 dark:via-background dark:to-background p-5 transition-shadow focus-within:shadow-lg focus-within:shadow-amber-500/5"
    >
      {/* Decorative corner glow */}
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500/5 dark:bg-amber-400/5 blur-2xl" />

      <div className="relative space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 dark:bg-amber-400/10">
            <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Quick Capture</h2>
            <p className="text-xs text-muted-foreground">Idea → saved in under 20 seconds</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="idea-title" className="text-xs font-medium text-muted-foreground">
              Title
            </Label>
            <Input
              id="idea-title"
              placeholder="AI onboarding copilot for docs"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="h-9 text-sm bg-background/80"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="idea-problem" className="text-xs font-medium text-muted-foreground">
              Problem (one line)
            </Label>
            <Input
              id="idea-problem"
              placeholder="Teams waste hours writing release notes"
              value={problemOneLiner}
              onChange={(event) => setProblemOneLiner(event.target.value)}
              required
              className="h-9 text-sm bg-background/80"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
            <Keyboard className="h-3 w-3" />
            Tab between fields, Enter to save
          </span>
          <Button
            type="submit"
            disabled={isSaving}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white"
          >
            {isSaving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="mr-1.5 h-3.5 w-3.5" />
            )}
            Capture
          </Button>
        </div>
      </div>
    </form>
  );
}
