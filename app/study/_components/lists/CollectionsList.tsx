"use client";

import { Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CollectionItem {
  _id: string;
  title: string;
  description?: string;
  items: Array<{ entityType: string; entityId: string; order: number }>;
  createdAt: number;
  updatedAt: number;
}

interface CollectionsListProps {
  collections: CollectionItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onAdd?: () => void;
}

export default function CollectionsList({
  collections,
  selectedId,
  onSelect,
  onAdd,
}: CollectionsListProps) {
  // Sort by update time (most recent first)
  const sortedCollections = [...collections].sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-6 w-6 text-slate-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Collections
            </h1>
            <p className="text-sm text-slate-500">
              {collections.length} collections for curated study
            </p>
          </div>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          New Collection
        </Button>
      </div>

      {/* Collection list */}
      {collections.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No collections yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Create collections to curate study materials around topics
          </p>
          <Button variant="outline" className="mt-4" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Create Collection
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCollections.map((collection) => (
            <div
              key={collection._id}
              onClick={() => onSelect(collection._id)}
              className={cn(
                "p-4 bg-white dark:bg-slate-800 rounded-lg border cursor-pointer transition-colors",
                selectedId === collection._id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              )}
            >
              <div className="flex items-start gap-3">
                <FolderOpen className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {collection.title}
                  </h3>
                  {collection.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                      {collection.description}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    {collection.items.length} item
                    {collection.items.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
