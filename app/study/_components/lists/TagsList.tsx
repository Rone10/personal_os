"use client";

import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TagItem {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: number;
}

interface TagsListProps {
  tags: TagItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onAdd?: () => void;
}

export default function TagsList({ tags, selectedId, onSelect, onAdd }: TagsListProps) {
  // Sort by creation time (newest first)
  const sortedTags = [...tags].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Tag className="h-6 w-6 text-slate-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Tags
            </h1>
            <p className="text-sm text-slate-500">
              {tags.length} tags in your collection
            </p>
          </div>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tag
        </Button>
      </div>

      {/* Tag list */}
      {tags.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <Tag className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No tags yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Create tags to organize and categorize your study materials
          </p>
          <Button variant="outline" className="mt-4" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tag
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedTags.map((tag) => (
            <div
              key={tag._id}
              onClick={() => onSelect(tag._id)}
              className={cn(
                "p-4 bg-white dark:bg-slate-800 rounded-lg border cursor-pointer transition-colors",
                selectedId === tag._id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color ?? "#94a3b8" }}
                />
                <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  #{tag.name}
                </span>
              </div>
              {tag.description && (
                <p className="text-sm text-slate-500 line-clamp-2">
                  {tag.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
