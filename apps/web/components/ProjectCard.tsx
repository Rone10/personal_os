'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Doc } from '@/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Folder, ArrowRight, Pencil, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Doc<"projects">;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [iconValue, setIconValue] = useState(project.icon || '');
  const [projectType, setProjectType] = useState<'coding' | 'general'>(project.type || 'general');
  const [projectStatus, setProjectStatus] = useState<'active' | 'archived' | 'idea'>(project.status);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showEmojiHint, setShowEmojiHint] = useState(false);
  const [emojiShortcut, setEmojiShortcut] = useState('Press Windows + . (Win) or Control + Command + Space (macOS) to open the system emoji keyboard.');
  const [formError, setFormError] = useState<string | null>(null);

  const updateProject = useMutation(api.projects.update);

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
    setName(project.name);
    setDescription(project.description || '');
    setIconValue(project.icon || '');
    setProjectType(project.type || 'general');
    setProjectStatus(project.status);
    setShowEmojiHint(false);
    setPickerOpen(false);
    setFormError(null);
  };

  async function handleEditClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsEditOpen(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);

    try {
      const trimmedName = name.trim();
      const trimmedDescription = description.trim();
      const trimmedIcon = iconValue.trim();

      const payload: Parameters<typeof updateProject>[0] = {
        id: project._id,
      };

      if (trimmedName !== project.name) {
        payload.name = trimmedName;
      }

      if ((project.description || '') !== trimmedDescription) {
        payload.description = trimmedDescription;
      }

      if ((project.icon || '') !== trimmedIcon) {
        payload.icon = trimmedIcon;
      }

      if ((project.type || 'general') !== projectType) {
        payload.type = projectType;
      }

      if (project.status !== projectStatus) {
        payload.status = projectStatus;
      }

      if (Object.keys(payload).length === 1) {
        setIsEditOpen(false);
        return;
      }

      await updateProject(payload);
      setIsEditOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update project.';
      setFormError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="group relative">
        <Link href={`/projects/${project._id}`} className="block">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors h-full flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl">
                {project.icon || <Folder className="h-5 w-5 text-slate-500" />}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                project.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                project.status === 'idea' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {project.status}
              </span>
            </div>
            
            <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-500 transition-colors">
              {project.name}
            </h3>
            
            <p className="text-slate-500 text-sm line-clamp-2 mb-4 flex-1">
              {project.description || "No description provided."}
            </p>

            <div className="flex items-center text-sm text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              View Project <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </div>
        </Link>
        <button
          onClick={handleEditClick}
          className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          title="Edit project"
          aria-label="Edit project"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            resetState();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Personal OS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Project type</Label>
              <Select value={projectType} onValueChange={(value) => setProjectType(value as 'coding' | 'general')}>
                <SelectTrigger id="edit-type">
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={projectStatus} onValueChange={(value) => setProjectStatus(value as 'active' | 'archived' | 'idea')}>
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you building?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-icon" className="flex items-center justify-between">
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
                  id="edit-icon"
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
              {formError && (
                <p className="text-sm text-red-500 mr-auto" role="alert">
                  {formError}
                </p>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
