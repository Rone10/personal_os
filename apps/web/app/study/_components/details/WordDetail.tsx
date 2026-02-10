"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import {
  Languages,
  Edit2,
  Trash2,
  Hash,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArabicText } from "@/components/ui/arabic-text";
import { cn } from "@/lib/utils";
import { EntityType, ViewType } from "../StudyPageClient";

interface WordDetailProps {
  wordId: string;
  onNavigate: (
    view: ViewType,
    type?: EntityType,
    id?: string,
    parent?: string
  ) => void;
  onEdit: () => void;
}

export default function WordDetail({
  wordId,
  onNavigate,
  onEdit,
}: WordDetailProps) {
  const data = useQuery(api.study.words.getDetail, {
    id: wordId as Id<"words">,
  });
  const deleteWord = useMutation(api.study.words.remove);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (data === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Word not found</p>
      </div>
    );
  }

  const { word, root } = data;

  const handleDelete = async () => {
    await deleteWord({ id: wordId as Id<"words"> });
    onNavigate("words");
  };

  const typeLabels: Record<string, string> = {
    harf: "Particle (حرف)",
    ism: "Noun (اسم)",
    fiil: "Verb (فعل)",
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Languages className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <ArabicText
              variant="word"
              size="3xl"
              as="h1"
              className="font-bold text-slate-900 dark:text-slate-100"
            >
              {word.text}
            </ArabicText>
            {word.transliteration && (
              <p className="text-slate-500">{word.transliteration}</p>
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
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
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

      {/* Type and Grammar Info */}
      <div className="flex flex-wrap gap-2 mb-6">
        {word.type && (
          <Badge variant="secondary" className="text-sm">
            {typeLabels[word.type] || word.type}
          </Badge>
        )}
        {word.wazan && (
          <Badge variant="outline" className="font-arabic">
            {word.wazan}
          </Badge>
        )}
        {word.language && (
          <Badge variant="outline">{word.language}</Badge>
        )}
      </div>

      {/* Root Link */}
      {root && (
        <div
          className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => onNavigate("roots", "root", root._id)}
        >
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Hash className="h-4 w-4" />
            Root
          </div>
          <div className="flex items-center gap-3">
            <ArabicText variant="word" size="xl">{root.letters}</ArabicText>
            <span className="text-slate-600 dark:text-slate-400">
              {root.coreMeaning}
            </span>
          </div>
        </div>
      )}

      {/* Meanings */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Meanings
        </h2>
        {word.meanings.length === 0 ? (
          <p className="text-slate-400 italic">No meanings defined</p>
        ) : (
          <div className="space-y-3">
            {word.meanings.map((meaning: { definition: string; usageContext?: string; examples?: string[] }, idx: number) => (
              <div
                key={idx}
                className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {meaning.definition}
                    </p>
                    {meaning.usageContext && (
                      <p className="text-sm text-slate-500 mt-1">
                        Context: {meaning.usageContext}
                      </p>
                    )}
                  </div>
                </div>
                {meaning.examples && meaning.examples.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">Examples:</p>
                    {meaning.examples.map((ex: string, i: number) => (
                      <ArabicText
                        key={i}
                        variant="word"
                        size="sm"
                        as="p"
                        className="text-slate-600 dark:text-slate-400"
                      >
                        {ex}
                      </ArabicText>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grammatical Info */}
      {word.grammaticalInfo && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Grammatical Information
          </h2>
          <div className="text-slate-600 dark:text-slate-400 space-y-1">
            {word.grammaticalInfo.gender && (
              <p>Gender: {word.grammaticalInfo.gender}</p>
            )}
            {word.grammaticalInfo.number && (
              <p>Number: {word.grammaticalInfo.number}</p>
            )}
            {word.grammaticalInfo.verbForm && (
              <p>Verb Form: {word.grammaticalInfo.verbForm}</p>
            )}
            {word.grammaticalInfo.nounType && (
              <p>Noun Type: {word.grammaticalInfo.nounType}</p>
            )}
          </div>
        </div>
      )}

      {/* Mastery */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500">Mastery Level</span>
          <span className="text-sm font-medium">
            {word.masteryLevel ?? 1} / 5
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn(
                "flex-1 h-2 rounded-full",
                level <= (word.masteryLevel ?? 1)
                  ? "bg-blue-500"
                  : "bg-slate-200 dark:bg-slate-700"
              )}
            />
          ))}
        </div>
        {word.nextReview && (
          <p className="text-xs text-slate-400 mt-2">
            Next review: {new Date(word.nextReview).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
