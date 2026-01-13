"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";

import { EntityReference } from "./extensions/entity-reference";
import type { RichTextViewerProps, EntityReferenceAttributes } from "./types";
import { cn } from "@/lib/utils";

export default function RichTextViewer({
  content,
  className,
  onEntityClick,
}: RichTextViewerProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: "text-blue-600 dark:text-blue-400 underline cursor-pointer",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
        },
      }),
      Table.configure({
        resizable: false,
        HTMLAttributes: {
          class: "border-collapse table-auto w-full",
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-slate-300 dark:border-slate-600 p-2",
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class:
            "border border-slate-300 dark:border-slate-600 p-2 bg-slate-100 dark:bg-slate-800 font-semibold",
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "list-none pl-0",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "flex items-start gap-2",
        },
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: "bg-yellow-200 dark:bg-yellow-800 px-1 rounded",
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      EntityReference.configure({
        onOpenPicker: () => {},
        HTMLAttributes: {
          class:
            "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1 rounded cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50",
        },
      }),
    ],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-slate dark:prose-invert max-w-none",
          "focus:outline-none"
        ),
      },
      handleClick: (view, pos, event) => {
        // Handle entity reference clicks
        const target = event.target as HTMLElement;
        const entityRef = target.closest("[data-entity-reference]");
        if (entityRef && onEntityClick) {
          const targetType = entityRef.getAttribute(
            "data-target-type"
          ) as EntityReferenceAttributes["targetType"];
          const targetId = entityRef.getAttribute("data-target-id");
          const displayText = entityRef.getAttribute("data-display-text");

          if (targetType && targetId && displayText) {
            onEntityClick({
              targetType,
              targetId,
              displayText,
            });
          }
          return true;
        }
        return false;
      },
    },
  });

  // Update content when it changes
  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!content) {
    return (
      <div className={cn("text-slate-400 italic", className)}>No content</div>
    );
  }

  return (
    <EditorContent
      editor={editor}
      className={cn("rich-text-viewer", className)}
    />
  );
}
