'use client';

import { useState } from 'react';
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

import { Doc } from '@/convex/_generated/dataModel';

export default function ProjectsPage() {
  const projects = useQuery(api.projects.get, { status: 'active' });
  const createProject = useMutation(api.projects.create);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      await createProject({
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        slug: (formData.get('name') as string).toLowerCase().replace(/\s+/g, '-'),
        icon: formData.get('icon') as string || undefined,
      });
      setIsOpen(false);
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
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="What are you building?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon (Emoji)</Label>
                <Input id="icon" name="icon" placeholder="🚀" className="w-20" />
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
