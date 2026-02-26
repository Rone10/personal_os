'use client';

import Link from 'next/link';
import { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';

type IdeaStatus = 'captured' | 'worth_exploring' | 'parked';

type IdeaListItem = {
  _id: Id<'ideas'>;
  title: string;
  problemOneLiner: string;
  status: IdeaStatus;
  referenceUrl?: string;
};

type IdeasListProps = {
  ideas: IdeaListItem[];
  onStatusChange: (id: Id<'ideas'>, status: IdeaStatus) => Promise<void>;
};

const columns: Array<{ key: IdeaStatus; label: string }> = [
  { key: 'captured', label: 'Captured' },
  { key: 'worth_exploring', label: 'Worth Exploring' },
  { key: 'parked', label: 'Parked' },
];

export function IdeasList({ ideas, onStatusChange }: IdeasListProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Ideas Vault</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((column) => {
          const items = ideas.filter((idea) => idea.status === column.key);
          return (
            <div key={column.key} className="rounded-lg border bg-card p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium">{column.label}</h3>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>

              <div className="space-y-3">
                {items.map((idea) => (
                  <div key={idea._id} className="rounded-md border p-3 bg-background">
                    <Link href={`/ideas/${idea._id}`} className="block hover:underline">
                      <p className="font-medium">{idea.title}</p>
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{idea.problemOneLiner}</p>
                    {idea.referenceUrl ? (
                      <a
                        className="mt-2 inline-block text-xs text-blue-500 hover:underline"
                        href={idea.referenceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Reference
                      </a>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {columns
                        .filter((statusCol) => statusCol.key !== idea.status)
                        .map((statusCol) => (
                          <Button
                            key={statusCol.key}
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onStatusChange(idea._id, statusCol.key)}
                          >
                            Move to {statusCol.label}
                          </Button>
                        ))}
                    </div>
                  </div>
                ))}

                {items.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No ideas here.
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
