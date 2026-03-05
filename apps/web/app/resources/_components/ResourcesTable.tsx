"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

type TopicRow = {
  _id: Id<"resources">;
  title: string;
  description?: string;
  tags?: string[];
  isFavorite: boolean;
  updatedAt: number;
  entriesCount: number;
  category?: { _id: Id<"resourceCategories">; name: string; color?: string } | null;
};

interface ResourcesTableProps {
  topics: TopicRow[];
  onToggleFavorite: (id: Id<"resources">) => Promise<void>;
}

export default function ResourcesTable({
  topics,
  onToggleFavorite,
}: ResourcesTableProps) {
  return (
    <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[4rem]">Fav</TableHead>
            <TableHead className="w-[18rem]">Topic</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead className="w-[8rem]">Links</TableHead>
            <TableHead className="w-[11rem]">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {topics.map((topic) => (
            <TableRow key={topic._id}>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onToggleFavorite(topic._id)}
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      topic.isFavorite
                        ? "fill-yellow-400 text-yellow-500"
                        : "text-slate-400",
                    )}
                  />
                </Button>
              </TableCell>
              <TableCell>
                <Link href={`/resources/${topic._id}`} className="hover:underline">
                  <p className="font-medium">{topic.title}</p>
                </Link>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {topic.description || "No description"}
                </p>
              </TableCell>
              <TableCell>
                {topic.category ? (
                  <Badge variant="outline">
                    {topic.category.name}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {topic.tags?.length ? (
                    topic.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[11px]">
                        #{tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </TableCell>
              <TableCell>{topic.entriesCount}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(topic.updatedAt).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
          {topics.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-sm text-muted-foreground">
                No resource topics match this filter.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
