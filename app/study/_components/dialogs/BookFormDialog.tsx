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

interface BookFormDialogProps {
  open: boolean;
  onClose: () => void;
  editId?: string;
}

export default function BookFormDialog({
  open,
  onClose,
  editId,
}: BookFormDialogProps) {
  const existingBook = useQuery(
    api.study.books.getBook,
    editId ? { id: editId as Id<"books"> } : "skip"
  );
  const createBook = useMutation(api.study.books.createBook);
  const updateBook = useMutation(api.study.books.updateBook);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [descriptionJson, setDescriptionJson] = useState<JSONContent | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingBook) {
      setTitle(existingBook.title);
      setAuthor(existingBook.author ?? "");
      // Load existing rich text content, falling back to creating content from plain text
      if (existingBook.descriptionJson) {
        setDescriptionJson(existingBook.descriptionJson as JSONContent);
      } else if (existingBook.description) {
        // Convert plain text to Tiptap JSON format for backwards compatibility
        setDescriptionJson({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: existingBook.description }],
            },
          ],
        });
      } else {
        setDescriptionJson(undefined);
      }
    } else if (!editId) {
      resetForm();
    }
  }, [existingBook, editId]);

  const resetForm = () => {
    setTitle("");
    setAuthor("");
    setDescriptionJson(undefined);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDescriptionChange = useCallback((content: JSONContent) => {
    setDescriptionJson(content);
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
      const plainText = getPlainText(descriptionJson);

      if (editId) {
        await updateBook({
          id: editId as Id<"books">,
          title,
          author: author || undefined,
          description: plainText || undefined,
          descriptionJson: descriptionJson,
        });
      } else {
        await createBook({
          title,
          author: author || undefined,
          description: plainText || undefined,
          descriptionJson: descriptionJson,
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
          <DialogTitle>{editId ? "Edit Book" : "Add Book"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Book title"
              required
            />
          </div>

          <div>
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author name"
            />
          </div>

          <div>
            <Label>Description</Label>
            <RichTextEditor
              value={descriptionJson}
              onChange={handleDescriptionChange}
              placeholder="Book description... Press Ctrl+K to insert a reference."
              enableEntityReferences={true}
              minHeight="200px"
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
