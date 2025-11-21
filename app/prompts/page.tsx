'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { Plus, Copy, Check, Star, Loader2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';

export default function PromptsPage() {
  const prompts = useQuery(api.prompts.getAll);
  const createPrompt = useMutation(api.prompts.create);
  const toggleFavorite = useMutation(api.prompts.toggleFavorite);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      await createPrompt({
        title: formData.get('title') as string,
        content: formData.get('content') as string,
        tags: (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean),
      });
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (prompts === undefined) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompt Library</h1>
          <p className="text-muted-foreground">Store and organize your AI prompts.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Prompt</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required placeholder="e.g. Code Refactor Expert" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Prompt Content</Label>
                <Textarea id="content" name="content" required className="h-64 font-mono text-sm" placeholder="You are an expert..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input id="tags" name="tags" placeholder="coding, refactoring, typescript" />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Prompt
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {prompts.map((prompt: Doc<"prompts">) => (
          <div key={prompt._id} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 group hover:border-purple-500 dark:hover:border-purple-500 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => toggleFavorite({ id: prompt._id })}
                  className={cn(
                    "hover:scale-110 transition-transform",
                    prompt.isFavorite ? "text-yellow-400" : "text-slate-300 hover:text-yellow-400"
                  )}
                >
                  <Star className={cn("h-5 w-5", prompt.isFavorite && "fill-current")} />
                </button>
                <h3 className="text-lg font-semibold">{prompt.title}</h3>
                <div className="flex gap-2">
                  {prompt.tags.map(tag => (
                    <span key={tag} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCopy(prompt.content, prompt._id)}
                className={cn(
                  "transition-all",
                  copiedId === prompt._id && "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                )}
              >
                {copiedId === prompt._id ? (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" /> Copy
                  </>
                )}
              </Button>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-950 rounded p-4 font-mono text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {prompt.content}
            </div>
          </div>
        ))}
        
        {prompts.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-500">
            No prompts saved yet.
          </div>
        )}
      </div>
    </div>
  );
}
