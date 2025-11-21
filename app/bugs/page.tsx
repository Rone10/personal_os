'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { Bug, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function BugsPage() {
  const bugs = useQuery(api.bugs.get);
  const createBug = useMutation(api.bugs.create);
  const updateStatus = useMutation(api.bugs.updateStatus);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      await createBug({
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        severity: formData.get('severity') as "low" | "medium" | "critical",
        reproductionSteps: formData.get('reproductionSteps') as string || undefined,
      });
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }

  if (bugs === undefined) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bug Tracker</h1>
          <p className="text-muted-foreground">Track and squash bugs across your projects.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Bug className="mr-2 h-4 w-4" /> Log Bug
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log New Bug</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required placeholder="e.g. Login fails on mobile" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select name="severity" defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" required placeholder="What happened?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reproductionSteps">Reproduction Steps</Label>
                <Textarea id="reproductionSteps" name="reproductionSteps" placeholder="1. Go to... 2. Click..." />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" variant="destructive" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Log Bug
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {bugs.map((bug: Doc<"bugs">) => (
          <div key={bug._id} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 flex items-start gap-4">
            <button
              onClick={() => updateStatus({ 
                id: bug._id, 
                status: bug.status === 'open' ? 'fixed' : 'open' 
              })}
              className={cn(
                "mt-1 transition-colors",
                bug.status === 'fixed' ? "text-green-500" : "text-slate-300 hover:text-green-500"
              )}
            >
              {bug.status === 'fixed' ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <Circle className="h-6 w-6" />
              )}
            </button>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className={cn(
                  "text-lg font-semibold",
                  bug.status === 'fixed' && "line-through text-slate-500"
                )}>
                  {bug.title}
                </h3>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium uppercase",
                  bug.severity === 'critical' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                  bug.severity === 'medium' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                )}>
                  {bug.severity}
                </span>
              </div>
              
              <p className="text-slate-600 dark:text-slate-400 mb-2">{bug.description}</p>
              
              {bug.reproductionSteps && (
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded text-sm font-mono text-slate-600 dark:text-slate-400">
                  <strong>Steps:</strong>
                  <pre className="whitespace-pre-wrap font-sans mt-1">{bug.reproductionSteps}</pre>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {bugs.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-500">
            No bugs found. Great job!
          </div>
        )}
      </div>
    </div>
  );
}
