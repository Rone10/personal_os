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

interface TagFormDialogProps {
  open: boolean;
  onClose: () => void;
  editId?: string;
}

const COLOR_OPTIONS = [
  { label: "Gray", value: "#94a3b8" },
  { label: "Red", value: "#f87171" },
  { label: "Orange", value: "#fb923c" },
  { label: "Yellow", value: "#facc15" },
  { label: "Green", value: "#4ade80" },
  { label: "Blue", value: "#60a5fa" },
  { label: "Purple", value: "#a78bfa" },
  { label: "Pink", value: "#f472b6" },
];

export default function TagFormDialog({
  open,
  onClose,
  editId,
}: TagFormDialogProps) {
  const existingTag = useQuery(
    api.study.tags.getById,
    editId ? { id: editId as Id<"tags"> } : "skip"
  );
  const createTag = useMutation(api.study.tags.create);
  const updateTag = useMutation(api.study.tags.update);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#94a3b8");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingTag) {
      setName(existingTag.name);
      setColor(existingTag.color ?? "#94a3b8");
    } else if (!editId) {
      resetForm();
    }
  }, [existingTag, editId]);

  const resetForm = () => {
    setName("");
    setColor("#94a3b8");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      if (editId) {
        await updateTag({
          id: editId as Id<"tags">,
          name,
          color,
        });
      } else {
        await createTag({
          name,
          color,
        });
      }
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editId ? "Edit Tag" : "Create Tag"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tag name"
              required
            />
          </div>

          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === opt.value
                      ? "ring-2 ring-offset-2 ring-slate-400 scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: opt.value }}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Label>Preview</Label>
            <div className="mt-2">
              <span
                className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {name || "Tag name"}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
