'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Settings,
  Smile,
  Plus,
  Bug,
  BookOpen,
  Languages,
  Hash,
  ScrollText,
  Sparkles,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => runCommand(() => router.push('/tasks?new=true'))}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Create Task</span>
              <CommandShortcut>⌘T</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/bugs?new=true'))}>
              <Bug className="mr-2 h-4 w-4" />
              <span>Log Bug</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Study Center">
            <CommandItem onSelect={() => runCommand(() => router.push('/study?view=words'))}>
              <Languages className="mr-2 h-4 w-4" />
              <span>Browse Words</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/study?view=roots'))}>
              <Hash className="mr-2 h-4 w-4" />
              <span>Browse Roots</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/study?view=verses'))}>
              <BookOpen className="mr-2 h-4 w-4" />
              <span>Browse Verses</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/study?view=hadiths'))}>
              <ScrollText className="mr-2 h-4 w-4" />
              <span>Browse Hadiths</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/study?view=flashcards'))}>
              <Sparkles className="mr-2 h-4 w-4" />
              <span>Start Flashcards</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => runCommand(() => router.push('/projects'))}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Projects</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/prompts'))}>
              <Smile className="mr-2 h-4 w-4" />
              <span>Prompts</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/settings'))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
