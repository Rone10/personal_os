'use client';

import { Doc } from '@/convex/_generated/dataModel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface VocabListProps {
  words: Doc<"words">[];
}

export function VocabList({ words }: VocabListProps) {
  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Arabic</TableHead>
            <TableHead>Translation</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Mastery</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {words.map((word) => (
            <TableRow key={word._id}>
              <TableCell className="font-medium font-arabic text-lg">{word.text}</TableCell>
              <TableCell>{word.meanings[0]?.definition || '-'}</TableCell>
              <TableCell className="font-mono text-xs text-slate-500">{word.type || '-'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-2 w-2 rounded-full ${
                        level <= (word.masteryLevel ?? 1)
                          ? 'bg-emerald-500'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
