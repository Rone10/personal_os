"use client";

import { Plus, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Word {
  _id: string;
  text: string;
  language: "arabic" | "english";
  meanings: Array<{ definition: string }>;
  type?: "harf" | "ism" | "fiil";
}

interface WordsListProps {
  words: Word[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onAdd?: () => void;
}

export default function WordsList({ words, selectedId, onSelect, onAdd }: WordsListProps) {

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Languages className="h-6 w-6 text-slate-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Vocabulary
            </h1>
            <p className="text-sm text-slate-500">
              {words.length} words in your collection
            </p>
          </div>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Word
        </Button>
      </div>

      {/* Word list */}
      {words.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <Languages className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No words yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Add your first vocabulary word to get started
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={onAdd}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Word
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
          {words.map((word) => (
            <div
              key={word._id}
              onClick={() => onSelect(word._id)}
              className={cn(
                "p-4 bg-white dark:bg-slate-800 rounded-lg border cursor-pointer transition-colors",
                selectedId === word._id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className={cn(
                      "text-lg font-medium",
                      word.language === "arabic" && "font-arabic text-xl"
                    )}
                    dir={word.language === "arabic" ? "rtl" : "ltr"}
                  >
                    {word.text}
                  </p>
                  {word.meanings[0] && (
                    <p className="text-sm text-slate-500 mt-1">
                      {word.meanings[0].definition}
                    </p>
                  )}
                </div>
                {word.type && (
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                    {word.type}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TODO: Add WordFormDialog here */}
    </div>
  );
}
