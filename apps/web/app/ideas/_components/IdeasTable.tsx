'use client';

import Link from 'next/link';
import { Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type IdeaStatus = 'captured' | 'worth_exploring' | 'parked';

type IdeaListItem = {
  _id: Id<'ideas'>;
  title: string;
  problemOneLiner: string;
  status: IdeaStatus;
  referenceUrl?: string;
};

type IdeasTableProps = {
  ideas: IdeaListItem[];
  onStatusChange: (id: Id<'ideas'>, status: IdeaStatus) => Promise<void>;
};

const statusLabel: Record<IdeaStatus, string> = {
  captured: 'Captured',
  worth_exploring: 'Worth Exploring',
  parked: 'Parked',
};

const statusBadgeClass: Record<IdeaStatus, string> = {
  captured:
    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  worth_exploring:
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  parked: 'bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-400/20',
};

export function IdeasTable({ ideas, onStatusChange }: IdeasTableProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[22rem]">Title</TableHead>
              <TableHead>Problem</TableHead>
              <TableHead className="w-[10rem]">Status</TableHead>
              <TableHead className="w-[8rem]">Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ideas.map((idea) => (
              <TableRow key={idea._id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/ideas/${idea._id}`}
                    className="hover:underline text-sm"
                  >
                    {idea.title}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[32rem]">
                  <p className="truncate text-sm text-muted-foreground">
                    {idea.problemOneLiner}
                  </p>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Badge
                      variant="outline"
                      className={statusBadgeClass[idea.status]}
                    >
                      {statusLabel[idea.status]}
                    </Badge>
                    <Select
                      value={idea.status}
                      onValueChange={(value) =>
                        onStatusChange(idea._id, value as IdeaStatus)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs w-full min-w-[9rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="captured">Captured</SelectItem>
                        <SelectItem value="worth_exploring">Worth Exploring</SelectItem>
                        <SelectItem value="parked">Parked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell>
                  {idea.referenceUrl ? (
                    <a
                      href={idea.referenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      Open
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {ideas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                  No ideas yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
