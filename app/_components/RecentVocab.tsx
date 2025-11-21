'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { BookOpen } from 'lucide-react';

export function RecentVocab() {
  const vocab = useQuery(api.study.getVocab, {});

  if (vocab === undefined) {
    return <div className="animate-pulse h-48 bg-slate-100 dark:bg-slate-900 rounded-lg" />;
  }

  // Sort by creation time (using _creationTime system field) and take top 5
  const recent = [...vocab]
    .sort((a, b) => b._creationTime - a._creationTime)
    .slice(0, 5);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-emerald-500" />
        Recent Vocab
      </h2>

      {recent.length === 0 ? (
        <p className="text-slate-500 text-sm">No vocabulary added yet.</p>
      ) : (
        <div className="space-y-3">
          {recent.map((word) => (
            <div key={word._id} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 last:border-0 pb-2 last:pb-0">
              <div>
                <p className="font-medium font-arabic text-lg">{word.arabicText}</p>
                <p className="text-xs text-slate-500">{word.translation}</p>
              </div>
              <div className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                {word.root || '---'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
