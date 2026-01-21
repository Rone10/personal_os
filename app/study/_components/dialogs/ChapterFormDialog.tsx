"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
import type { JSONContent } from "@/components/rich-text/types";

interface ChapterFormDialogProps {
  open: boolean;
  onClose: () => void;
  bookId: string;
  editId?: string;
}

export default function ChapterFormDialog({
  open,
  onClose,
  bookId,
  editId,
}: ChapterFormDialogProps) {
  const existingChapter = useQuery(
    api.study.books.getChapter,
    editId ? { id: editId as Id<"chapters"> } : "skip"
  );
  const createChapter = useMutation(api.study.books.createChapter);
  const updateChapter = useMutation(api.study.books.updateChapter);

  const [title, setTitle] = useState("");
  const [contentJson, setContentJson] = useState<JSONContent | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingChapter) {
      setTitle(existingChapter.title);
      // Load existing rich text content, falling back to creating content from plain text
      if (existingChapter.contentJson) {
        setContentJson(existingChapter.contentJson as JSONContent);
      } else if (existingChapter.content) {
        // Convert plain text to Tiptap JSON format for backwards compatibility
        setContentJson({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: existingChapter.content }],
            },
          ],
        });
      } else {
        setContentJson(undefined);
      }
    } else if (!editId) {
      resetForm();
    }
  }, [existingChapter, editId]);

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
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const plainText = getPlainText(contentJson);

      if (editId) {
        await updateChapter({
          id: editId as Id<"chapters">,
          title,
          content: plainText || undefined,
          contentJson: contentJson,
        });
      } else {
        await createChapter({
          bookId: bookId as Id<"books">,
          title,
          content: plainText || undefined,
          contentJson: contentJson,
        });
      }
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? "Edit Chapter" : "Add Chapter"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Chapter title"
              required
            />
          </div>

          <div>
            <Label>Content</Label>
            <RichTextEditor
              value={contentJson}
              onChange={handleContentChange}
              placeholder="Chapter content... Press Ctrl+K to insert a reference."
              enableEntityReferences={true}
              minHeight="400px"
              className="mt-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !title.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
