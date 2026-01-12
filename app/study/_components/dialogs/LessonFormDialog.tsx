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

interface LessonFormDialogProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  editId?: string;
}

export default function LessonFormDialog({
  open,
  onClose,
  courseId,
  editId,
}: LessonFormDialogProps) {
  const existingLesson = useQuery(
    api.study.courses.getLesson,
    editId ? { id: editId as Id<"lessons"> } : "skip"
  );
  const createLesson = useMutation(api.study.courses.createLesson);
  const updateLesson = useMutation(api.study.courses.updateLesson);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingLesson) {
      setTitle(existingLesson.title);
      setContent(existingLesson.content ?? "");
    } else if (!editId) {
      resetForm();
    }
  }, [existingLesson, editId]);

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
        await updateLesson({
          id: editId as Id<"lessons">,
          title,
          content: content || undefined,
        });
      } else {
        await createLesson({
          courseId: courseId as Id<"courses">,
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
          <DialogTitle>{editId ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lesson title"
              required
            />
          </div>

          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Lesson content..."
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
