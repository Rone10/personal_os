"use client";

import { useCallback, useState } from "react";
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
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";

import { EntityReference } from "./extensions/entity-reference";
import EditorToolbar from "./EditorToolbar";
import type { RichTextEditorProps, EntityReferenceType } from "./types";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Keyboard } from "lucide-react";

// Lazy import for LinkPicker to avoid circular dependencies
import dynamic from "next/dynamic";
const LinkPicker = dynamic(
  () => import("@/app/study/_components/editor/LinkPicker"),
  { ssr: false }
);

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  className,
  enableEntityReferences = true,
  currentNoteId,
  minHeight = "200px",
  editable = true,
}: RichTextEditorProps) {
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const handleOpenPicker = useCallback(() => {
    setShowLinkPicker(true);
  }, []);

  const editor = useEditor({
    immediatelyRender: false, // Prevents SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 dark:text-blue-400 underline cursor-pointer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
        },
      }),
      Table.configure({
        resizable: true,
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
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      ...(enableEntityReferences
        ? [
            EntityReference.configure({
              onOpenPicker: handleOpenPicker,
              HTMLAttributes: {
                class:
                  "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1 rounded cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50",
              },
            }),
          ]
        : []),
    ],
    content: value,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-slate dark:prose-invert max-w-none",
          "focus:outline-none",
          "p-4"
        ),
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Handle entity reference selection from LinkPicker
  const handleEntitySelect = useCallback(
    (ref: {
      type: EntityReferenceType;
      id: string;
      displayText: string;
    }) => {
      if (!editor) return;

      // Insert the reference as a text node with the entityReference mark already applied
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: ref.displayText,
          marks: [
            {
              type: "entityReference",
              attrs: {
                targetType: ref.type,
                targetId: ref.id,
                displayText: ref.displayText,
              },
            },
          ],
        })
        .run();

      setShowLinkPicker(false);
    },
    [editor]
  );

  // Handle standard link insertion
  const handleInsertLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    setLinkUrl(previousUrl || "");
    setShowLinkDialog(true);
  }, [editor]);

  const handleLinkSubmit = useCallback(() => {
    if (!editor || !linkUrl) return;

    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
    }

    setShowLinkDialog(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  // Handle image insertion
  const handleInsertImage = useCallback(() => {
    setImageUrl("");
    setShowImageDialog(true);
  }, []);

  const handleImageSubmit = useCallback(() => {
    if (!editor || !imageUrl) return;

    editor.chain().focus().setImage({ src: imageUrl }).run();

    setShowImageDialog(false);
    setImageUrl("");
  }, [editor, imageUrl]);

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {editable && (
        <EditorToolbar
          editor={editor}
          onInsertLink={handleInsertLink}
          onInsertImage={handleInsertImage}
          onInsertEntityReference={handleOpenPicker}
          enableEntityReferences={enableEntityReferences}
        />
      )}

      <EditorContent
        editor={editor}
        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
      />

      {editable && enableEntityReferences && (
        <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-1">
            <Keyboard className="h-3 w-3" />
            <span>Ctrl+K to insert entity reference</span>
          </div>
        </div>
      )}

      {/* Entity Reference Picker */}
      {enableEntityReferences && (
        <LinkPicker
          open={showLinkPicker}
          onClose={() => setShowLinkPicker(false)}
          onSelect={handleEntitySelect}
          currentNoteId={currentNoteId}
        />
      )}

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLinkSubmit();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowLinkDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleLinkSubmit}>Insert</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleImageSubmit();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowImageDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleImageSubmit}>Insert</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
