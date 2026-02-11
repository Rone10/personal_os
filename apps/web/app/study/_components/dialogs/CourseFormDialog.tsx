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

interface CourseFormDialogProps {
  open: boolean;
  onClose: () => void;
  editId?: string;
}

export default function CourseFormDialog({
  open,
  onClose,
  editId,
}: CourseFormDialogProps) {
  const existingCourse = useQuery(
    api.study.courses.getCourse,
    editId ? { id: editId as Id<"courses"> } : "skip"
  );
  const createCourse = useMutation(api.study.courses.createCourse);
  const updateCourse = useMutation(api.study.courses.updateCourse);

  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [descriptionJson, setDescriptionJson] = useState<JSONContent | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingCourse) {
      setTitle(existingCourse.title);
      setSource(existingCourse.source ?? "");
      // Load existing rich text content, falling back to creating content from plain text
      if (existingCourse.descriptionJson) {
        setDescriptionJson(existingCourse.descriptionJson as JSONContent);
      } else if (existingCourse.description) {
        // Convert plain text to Tiptap JSON format for backwards compatibility
        setDescriptionJson({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: existingCourse.description }],
            },
          ],
        });
      } else {
        setDescriptionJson(undefined);
      }
    } else if (!editId) {
      resetForm();
    }
  }, [existingCourse, editId]);

  const resetForm = () => {
    setTitle("");
    setSource("");
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
        await updateCourse({
          id: editId as Id<"courses">,
          title,
          source: source.trim() || undefined,
          description: plainText || undefined,
          descriptionJson: descriptionJson,
        });
      } else {
        await createCourse({
          title,
          source: source.trim() || undefined,
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
          <DialogTitle>{editId ? "Edit Course" : "Add Course"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Course title"
              required
            />
          </div>

          <div>
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Platform, instructor, or URL"
            />
          </div>

          <div>
            <Label>Description</Label>
            <RichTextEditor
              value={descriptionJson}
              onChange={handleDescriptionChange}
              placeholder="Course description... Press Ctrl+K to insert a reference."
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
