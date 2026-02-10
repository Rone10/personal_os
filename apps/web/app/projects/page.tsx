'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ProjectCard } from '@/components/ProjectCard';
import { Plus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { Doc } from '@/convex/_generated/dataModel';

export default function ProjectsPage() {
  const projects = useQuery(api.projects.get, { status: 'active' });
  const createProject = useMutation(api.projects.create);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [iconValue, setIconValue] = useState('');
  const [projectType, setProjectType] = useState<'coding' | 'general'>('general');
  const [showEmojiHint, setShowEmojiHint] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [emojiShortcut, setEmojiShortcut] = useState('Press Windows + . (Win) or Control + Command + Space (macOS) to open the system emoji keyboard.');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const platform = window.navigator.platform.toLowerCase();
    if (platform.includes('mac')) {
      setEmojiShortcut('Press Control ⌃ + Command ⌘ + Space to open the emoji keyboard.');
    } else if (platform.includes('win')) {
      setEmojiShortcut('Press Windows ⊞ + . (period) to open the emoji keyboard.');
    } else {
      setEmojiShortcut('Use your OS emoji panel (e.g., Windows ⊞ + . or Control + Command + Space).');
    }
  }, []);

  const emojiOptions = useMemo(
    () => ['🚀', '🎯', '💡', '🛠️', '📚', '🔥', '🧠', '📦', '✅', '🌀', '⚙️', '🌱', '🛰️', '🎨', '🗺️'],
    []
  );

  const resetState = () => {
    setIconValue('');
    setShowEmojiHint(false);
    setPickerOpen(false);
    setProjectType('general');
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      await createProject({
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        slug: (formData.get('name') as string).toLowerCase().replace(/\s+/g, '-'),
        icon: iconValue.trim() || undefined,
        type: projectType,
      });
      setIsOpen(false);
      e.currentTarget.reset();
      resetState();
    } finally {
      setIsLoading(false);
    }
  }

  if (projects === undefined) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your active projects and ideas.</p>
        </div>
        
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              resetState();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="e.g. Personal OS" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Project type</Label>
                <Select value={projectType} onValueChange={(value) => setProjectType(value as 'coding' | 'general')}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="coding">Coding</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="What are you building?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon" className="flex items-center justify-between">
                  <span>Icon (Emoji)</span>
                  <button
                    type="button"
                    className="text-xs text-blue-500 hover:underline"
                    onClick={() => setShowEmojiHint((prev) => !prev)}
                  >
                    {showEmojiHint ? 'Hide keyboard tips' : 'Need keyboard shortcut?'}
                  </button>
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="icon"
                    name="icon"
                    placeholder="🚀"
                    className="w-24 text-center text-xl"
                    value={iconValue}
                    onChange={(e) => setIconValue(e.target.value)}
                    onFocus={() => setShowEmojiHint(true)}
                  />
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
                    <span className="text-2xl" aria-label="Icon preview">
                      {iconValue.trim() || '🚀'}
                    </span>
                    <span className="text-xs text-slate-500">Preview</span>
                  </div>
                  <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        Choose Emoji
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60">
                      <p className="mb-2 text-xs text-muted-foreground">Quick picks</p>
                      <div className="grid grid-cols-5 gap-2">
                        {emojiOptions.map((emoji) => (
                          <button
                            type="button"
                            key={emoji}
                            className={cn(
                              'rounded-md border border-transparent bg-slate-100 py-1 text-xl transition hover:border-blue-500 hover:bg-blue-50 dark:bg-slate-800',
                              iconValue === emoji && 'border-blue-500 bg-blue-50 dark:bg-slate-700'
                            )}
                            onClick={() => {
                              setIconValue(emoji);
                              setPickerOpen(false);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                {showEmojiHint && (
                  <p className="text-xs text-muted-foreground">
                    {emojiShortcut}
                  </p>
                )}
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project: Doc<"projects">) => (
          <ProjectCard key={project._id} project={project} />
        ))}
        {projects.length === 0 && (
          <div className="col-span-full text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-500">
            No active projects found. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
