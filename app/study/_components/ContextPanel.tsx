"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Link2, Tag, MessageSquareText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EntityType, ViewType } from "./StudyPageClient";

interface ContextPanelProps {
  entityType: EntityType;
  entityId: string;
  onNavigate: (
    view: ViewType,
    type?: EntityType,
    id?: string,
    parent?: string
  ) => void;
}

export default function ContextPanel({
  entityType,
  entityId,
  onNavigate,
}: ContextPanelProps) {
  // Get backlinks for this entity
  const backlinks = useQuery(api.study.backlinks.getBacklinksFor, {
    targetType: entityType,
    targetId: entityId,
  });

  // Get tags for this entity
  const tags = useQuery(api.study.tags.getEntityTags, {
    entityType: entityType as "word" | "verse" | "hadith" | "note" | "lesson" | "chapter" | "root" | "explanation",
    entityId: entityId,
  });

  // Get explanations if applicable
  const explanations = useQuery(
    api.study.explanations.listBySubject,
    entityType === "word" || entityType === "verse" || entityType === "hadith" || entityType === "root"
      ? {
          subjectType: entityType as "word" | "verse" | "hadith" | "root",
          subjectId: entityId,
        }
      : "skip"
  );

  return (
    <div className="p-4 space-y-6">
      {/* Backlinks Section */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          <Link2 className="h-4 w-4" />
          Backlinks
        </h3>
        {backlinks === undefined ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        ) : backlinks.length === 0 ? (
          <p className="text-sm text-slate-400 italic">
            No notes reference this item
          </p>
        ) : (
          <div className="space-y-2">
            {backlinks.map((bl) => (
              <div
                key={bl._id}
                className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700"
                onClick={() => onNavigate("notes", "note", bl.noteId)}
              >
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                  {bl.noteTitle ?? "Untitled Note"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {bl.snippet}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tags Section */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          <Tag className="h-4 w-4" />
          Tags
        </h3>
        {tags === undefined ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        ) : tags.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No tags</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tags.filter(Boolean).map((tag) => (
              <Badge
                key={tag!._id}
                variant="secondary"
                className="cursor-pointer"
                style={tag!.color ? { backgroundColor: tag!.color } : undefined}
              >
                {tag!.name}
              </Badge>
            ))}
          </div>
        )}
      </section>

      {/* Explanations Section (only for word/verse/hadith/root) */}
      {(entityType === "word" ||
        entityType === "verse" ||
        entityType === "hadith" ||
        entityType === "root") && (
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            <MessageSquareText className="h-4 w-4" />
            Explanations
          </h3>
          {explanations === undefined ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : explanations.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No explanations</p>
          ) : (
            <div className="space-y-2">
              {explanations.map((exp) => (
                <div
                  key={exp._id}
                  className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {exp.sourceType}
                    </Badge>
                    {exp.sourceLabel && (
                      <span className="text-xs text-slate-500">
                        {exp.sourceLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {exp.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
