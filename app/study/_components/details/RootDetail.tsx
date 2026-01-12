"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { Hash, Edit2, Trash2, Loader2, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityType, ViewType } from "../StudyPageClient";

interface RootDetailProps {
  rootId: string;
  onNavigate: (
    view: ViewType,
    type?: EntityType,
    id?: string,
    parent?: string
  ) => void;
  onEdit: () => void;
}

export default function RootDetail({
  rootId,
  onNavigate,
  onEdit,
}: RootDetailProps) {
  const root = useQuery(api.study.roots.getById, { id: rootId as Id<"roots"> });
  const derivedWords = useQuery(api.study.words.list, {
    rootId: rootId as Id<"roots">,
  });
  const deleteRoot = useMutation(api.study.roots.remove);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (root === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (root === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Root not found</p>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteRoot({ id: rootId as Id<"roots"> });
    onNavigate("roots");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Hash className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1
              className="text-4xl font-arabic font-bold text-slate-900 dark:text-slate-100"
              dir="rtl"
            >
              {root.letters}
            </h1>
            {root.latinized && (
              <p className="text-lg text-slate-500 font-mono">{root.latinized}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Confirm
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Core Meaning */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Core Meaning
        </h2>
        <p className="text-xl text-slate-900 dark:text-slate-100">
          {root.coreMeaning}
        </p>
      </div>

      {/* Notes */}
      {root.notes && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Notes
          </h2>
          <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
            {root.notes}
          </p>
        </div>
      )}

      {/* Derived Words */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Derived Words
          </h2>
          {derivedWords && (
            <Badge variant="secondary">{derivedWords.length} words</Badge>
          )}
        </div>

        {derivedWords === undefined ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : derivedWords.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
            <Languages className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No words derived from this root yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Add words and link them to this root
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {derivedWords.map((word) => (
              <div
                key={word._id}
                onClick={() => onNavigate("words", "word", word._id)}
                className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-arabic text-lg">{word.text}</span>
                    {word.transliteration && (
                      <span className="text-sm text-slate-400 ml-2">
                        ({word.transliteration})
                      </span>
                    )}
                  </div>
                  {word.type && (
                    <Badge variant="outline" className="text-xs">
                      {word.type}
                    </Badge>
                  )}
                </div>
                {word.meanings[0]?.definition && (
                  <p className="text-sm text-slate-500 mt-1">
                    {word.meanings[0].definition}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
