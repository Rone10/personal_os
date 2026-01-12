"use client";

import { Plus, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Note {
  _id: string;
  title?: string;
  content: string;
  parentType?: string;
  updatedAt: number;
}

interface NotesListProps {
  notes: Note[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onAdd?: () => void;
}

export default function NotesList({ notes, selectedId, onSelect, onAdd }: NotesListProps) {

  // Sort by updated time
  const sortedNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <StickyNote className="h-6 w-6 text-slate-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Notes
            </h1>
            <p className="text-sm text-slate-500">
              {notes.length} notes in your collection
            </p>
          </div>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>

      {/* Note list */}
      {notes.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <StickyNote className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No notes yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Create notes to capture your learning
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={onAdd}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {sortedNotes.map((note) => (
            <div
              key={note._id}
              onClick={() => onSelect(note._id)}
              className={cn(
                "p-4 bg-white dark:bg-slate-800 rounded-lg border cursor-pointer transition-colors",
                selectedId === note._id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {note.title ?? "Untitled Note"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                    {note.content}
                  </p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0 ml-4">
                  {formatDate(note.updatedAt)}
                </span>
              </div>
              {note.parentType && (
                <span className="inline-block mt-2 text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                  {note.parentType}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
