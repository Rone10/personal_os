'use client';

import Link from 'next/link';
import { Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Compass,
  PauseCircle,
  ArrowRight,
  ExternalLink,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

const columns: Array<{
  key: IdeaStatus;
  label: string;
  icon: React.ReactNode;
  accentClass: string;
  dotClass: string;
  badgeClass: string;
}> = [
  {
    key: 'captured',
    label: 'Captured',
    icon: <Zap className="h-3.5 w-3.5" />,
    accentClass: 'border-t-amber-500 dark:border-t-amber-400',
    dotClass: 'bg-amber-500 dark:bg-amber-400',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  {
    key: 'worth_exploring',
    label: 'Worth Exploring',
    icon: <Compass className="h-3.5 w-3.5" />,
    accentClass: 'border-t-emerald-500 dark:border-t-emerald-400',
    dotClass: 'bg-emerald-500 dark:bg-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  {
    key: 'parked',
    label: 'Parked',
    icon: <PauseCircle className="h-3.5 w-3.5" />,
    accentClass: 'border-t-slate-400 dark:border-t-slate-500',
    dotClass: 'bg-slate-400 dark:bg-slate-500',
    badgeClass: 'bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-400/20',
  },
];

const statusAccentBar: Record<IdeaStatus, string> = {
  captured: 'bg-amber-500 dark:bg-amber-400',
  worth_exploring: 'bg-emerald-500 dark:bg-emerald-400',
  parked: 'bg-slate-400 dark:bg-slate-500',
};

export function IdeasList({ ideas, onStatusChange }: IdeasListProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Ideas Vault</h2>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {columns.map((column) => {
          const items = ideas.filter((idea) => idea.status === column.key);
          return (
            <div
              key={column.key}
              className={cn(
                'rounded-xl border border-t-2 bg-card/50 backdrop-blur-sm',
                column.accentClass,
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-md text-white',
                      column.dotClass,
                    )}
                  >
                    {column.icon}
                  </span>
                  <h3 className="text-sm font-semibold tracking-tight">{column.label}</h3>
                </div>
                <Badge
                  variant="outline"
                  className={cn('text-[11px] font-mono tabular-nums', column.badgeClass)}
                >
                  {items.length}
                </Badge>
              </div>

              {/* Column Body */}
              <div className="space-y-2.5 px-3 pb-3">
                {items.map((idea, i) => (
                  <div
                    key={idea._id}
                    className="group relative overflow-hidden rounded-lg border bg-background transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 idea-card-enter"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    {/* Accent bar */}
                    <div
                      className={cn(
                        'absolute inset-y-0 left-0 w-[3px]',
                        statusAccentBar[idea.status],
                      )}
                    />

                    <div className="py-3 pl-4 pr-3">
                      <Link href={`/ideas/${idea._id}`} className="block">
                        <p className="font-medium text-sm leading-snug tracking-tight group-hover:text-foreground/90 transition-colors">
                          {idea.title}
                        </p>
                      </Link>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
                        {idea.problemOneLiner}
                      </p>

                      {idea.referenceUrl ? (
                        <a
                          className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                          href={idea.referenceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Reference
                        </a>
                      ) : null}

                      {/* Status actions */}
                      <div className="mt-3 flex gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        {columns
                          .filter((sc) => sc.key !== idea.status)
                          .map((sc) => (
                            <button
                              key={sc.key}
                              type="button"
                              onClick={() => onStatusChange(idea._id, sc.key)}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                                'hover:bg-accent hover:text-accent-foreground',
                              )}
                            >
                              <ArrowRight className="h-3 w-3" />
                              {sc.label}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                ))}

                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                    <Inbox className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground/60">No ideas here yet</p>
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
