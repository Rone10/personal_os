"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import RichTextEditor from "@/components/rich-text/RichTextEditor";
import { extractReferences, type JSONContent } from "@/components/rich-text/types";

interface NoteFormDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (noteId: string) => void;
}

export default function NoteFormDialog({
  open,
  onClose,
  onCreated,
}: NoteFormDialogProps) {
  const createNote = useMutation(api.study.notes.create);

  const [title, setTitle] = useState("");
  const [contentJson, setContentJson] = useState<JSONContent | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setTitle("");
    setContentJson(undefined);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleContentChange = useCallback((content: JSONContent) => {
    setContentJson(content);
  }, []);

  // Extract plain text from Tiptap JSON for backwards compatibility
  const getPlainText = (json: JSONContent | undefined): string => {
    if (!json) return "";

    const extractText = (node: JSONContent): string => {
      if (node.type === "text") {
        return node.text || "";
      }
      if (node.content) {
        return node.content.map(extractText).join("");
      }
      return "";
    };

    return extractText(json);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    try {
      // Extract plain text for backwards compatibility and search
      const plainText = getPlainText(contentJson);

      // Extract entity references from rich text content
      const extractedRefs = contentJson ? extractReferences(contentJson) : [];

      const noteId = await createNote({
        title: title || undefined,
        content: plainText || "",
        contentJson: contentJson,
        extractedReferences: extractedRefs.length > 0 ? extractedRefs : undefined,
      });
      handleClose();
      if (onCreated) {
        onCreated(noteId);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Note</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title (optional)"
            />
          </div>

          <div>
            <Label>Content</Label>
            <RichTextEditor
              value={contentJson}
              onChange={handleContentChange}
              placeholder="Start writing... Press Ctrl+K to insert a reference."
              enableEntityReferences={true}
              minHeight="250px"
              className="mt-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
