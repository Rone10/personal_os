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
import { Loader2 } from "lucide-react";

interface TopicFormDialogProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  editId?: string;
}

export default function TopicFormDialog({
  open,
  onClose,
  courseId,
  editId,
}: TopicFormDialogProps) {
  const existingTopic = useQuery(
    api.study.courses.getTopic,
    editId ? { id: editId as Id<"topics"> } : "skip"
  );
  const createTopic = useMutation(api.study.courses.createTopic);
  const updateTopic = useMutation(api.study.courses.updateTopic);

  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingTopic) {
      setTitle(existingTopic.title);
    } else if (!editId) {
      setTitle("");
    }
  }, [existingTopic, editId]);

  const handleClose = () => {
    setTitle("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      if (editId) {
        await updateTopic({
          id: editId as Id<"topics">,
          title,
        });
      } else {
        if (!courseId) return;
        await createTopic({
          courseId: courseId as Id<"courses">,
          title,
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
          <DialogTitle>{editId ? "Edit Topic" : "Add Topic"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Topic title"
              required
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
