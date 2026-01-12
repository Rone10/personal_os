"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Languages, BookOpen, ScrollText, Hash } from "lucide-react";
import { InlineReference } from "./NoteEditor";

interface NoteRendererProps {
  content: string;
  references: InlineReference[];
  onReferenceClick?: (type: string, id: string) => void;
  className?: string;
}

export default function NoteRenderer({
  content,
  references,
  onReferenceClick,
  className,
}: NoteRendererProps) {
  // Sort references by startOffset
  const sortedRefs = useMemo(() => {
    return [...references].sort((a, b) => a.startOffset - b.startOffset);
  }, [references]);

  // Build content segments with references
  const segments = useMemo(() => {
    const result: Array<{
      type: "text" | "reference";
      content: string;
      ref?: InlineReference;
    }> = [];

    let lastIndex = 0;

    for (const ref of sortedRefs) {
      // Add text before reference
      if (ref.startOffset > lastIndex) {
        result.push({
          type: "text",
          content: content.slice(lastIndex, ref.startOffset),
        });
      }

      // Add reference
      result.push({
        type: "reference",
        content: content.slice(ref.startOffset, ref.endOffset),
        ref,
      });

      lastIndex = ref.endOffset;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      result.push({
        type: "text",
        content: content.slice(lastIndex),
      });
    }

    return result;
  }, [content, sortedRefs]);

  const getRefIcon = (type: string) => {
    switch (type) {
      case "word":
        return <Languages className="h-3 w-3" />;
      case "verse":
        return <BookOpen className="h-3 w-3" />;
      case "hadith":
        return <ScrollText className="h-3 w-3" />;
      case "root":
        return <Hash className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getRefColor = (type: string) => {
    switch (type) {
      case "word":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50";
      case "verse":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50";
      case "hadith":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50";
      case "root":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  if (!content) {
    return (
      <p className={cn("text-slate-400 italic", className)}>
        No content.
      </p>
    );
  }

  return (
    <div className={cn("whitespace-pre-wrap text-slate-700 dark:text-slate-300", className)}>
      {segments.map((segment, idx) => {
        if (segment.type === "text") {
          return <span key={idx}>{segment.content}</span>;
        }

        const ref = segment.ref!;
        return (
          <button
            key={idx}
            onClick={() => onReferenceClick?.(ref.targetType, ref.targetId)}
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-sm font-medium",
              "transition-colors cursor-pointer",
              getRefColor(ref.targetType)
            )}
            title={`${ref.targetType}: ${ref.targetId}`}
          >
            {getRefIcon(ref.targetType)}
            <span>{segment.content}</span>
          </button>
        );
      })}
    </div>
  );
}
