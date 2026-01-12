"use client";

import { Plus, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Root {
  _id: string;
  letters: string;
  latinized: string;
  coreMeaning: string;
}

interface RootsListProps {
  roots: Root[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onAdd?: () => void;
}

export default function RootsList({ roots, selectedId, onSelect, onAdd }: RootsListProps) {

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Hash className="h-6 w-6 text-slate-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Arabic Roots
            </h1>
            <p className="text-sm text-slate-500">
              {roots.length} roots in your collection
            </p>
          </div>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Root
        </Button>
      </div>

      {/* Root list */}
      {roots.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <Hash className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No roots yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Add Arabic roots to organize your vocabulary
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={onAdd}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Root
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {roots.map((root) => (
            <div
              key={root._id}
              onClick={() => onSelect(root._id)}
              className={cn(
                "p-4 bg-white dark:bg-slate-800 rounded-lg border cursor-pointer transition-colors text-center",
                selectedId === root._id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              )}
            >
              <p className="font-arabic text-2xl mb-1" dir="rtl">
                {root.letters}
              </p>
              <p className="text-xs text-slate-400 font-mono">{root.latinized}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                {root.coreMeaning}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
