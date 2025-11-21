'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { VocabList } from '@/components/VocabList';
import { Flashcard } from '@/components/Flashcard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function StudyPage() {
  const vocab = useQuery(api.study.getVocab, {});
  const addVocab = useMutation(api.study.addVocab);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      await addVocab({
        arabicText: formData.get('arabicText') as string,
        translation: formData.get('translation') as string,
        root: formData.get('root') as string || undefined,
      });
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }

  if (vocab === undefined) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Center</h1>
          <p className="text-muted-foreground">Master Arabic vocabulary and Quranic roots.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Word
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Vocabulary</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="arabicText">Arabic Text</Label>
                <Input id="arabicText" name="arabicText" required className="font-arabic text-lg text-right" placeholder="كَتَبَ" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="translation">Translation</Label>
                <Input id="translation" name="translation" required placeholder="To write" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="root">Root (Optional)</Label>
                <Input id="root" name="root" placeholder="k-t-b" />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list">Vocabulary List</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          <VocabList vocab={vocab} />
        </TabsContent>
        
        <TabsContent value="flashcards">
          <Flashcard vocab={vocab} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
