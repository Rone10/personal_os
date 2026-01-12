"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

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
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingChapter) {
      setTitle(existingChapter.title);
      setContent(existingChapter.content ?? "");
    } else if (!editId) {
      resetForm();
    }
  }, [existingChapter, editId]);

  const resetForm = () => {
    setTitle("");
    setContent("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      if (editId) {
        await updateChapter({
          id: editId as Id<"chapters">,
          title,
          content: content || undefined,
        });
      } else {
        await createChapter({
          bookId: bookId as Id<"books">,
          title,
          content: content || undefined,
        });
      }
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
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
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Chapter content..."
              rows={8}
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
