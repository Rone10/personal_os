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
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingBook) {
      setTitle(existingBook.title);
      setAuthor(existingBook.author ?? "");
      setDescription(existingBook.description ?? "");
    } else if (!editId) {
      resetForm();
    }
  }, [existingBook, editId]);

  const resetForm = () => {
    setTitle("");
    setAuthor("");
    setDescription("");
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
        await updateBook({
          id: editId as Id<"books">,
          title,
          author: author || undefined,
          description: description || undefined,
        });
      } else {
        await createBook({
          title,
          author: author || undefined,
          description: description || undefined,
        });
      }
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Book description..."
              rows={3}
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
