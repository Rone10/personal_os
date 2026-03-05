"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type Category = {
  _id: Id<"resourceCategories">;
  name: string;
  color?: string;
  isDefault?: boolean;
};

interface ResourceCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onCreate: (values: { name: string; color?: string }) => Promise<void>;
  onRemove: (id: Id<"resourceCategories">) => Promise<void>;
}

export default function ResourceCategoryDialog({
  open,
  onOpenChange,
  categories,
  onCreate,
  onRemove,
}: ResourceCategoryDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748b");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<Id<"resourceCategories"> | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreate({ name: name.trim(), color: color.trim() || undefined });
      setName("");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(id: Id<"resourceCategories">) {
    setRemovingId(id);
    try {
      await onRemove(id);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>
            Categories are single-select per resource topic.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-52 overflow-y-auto">
          {categories.map((category) => (
            <div
              key={category._id}
              className="flex items-center justify-between rounded-md border p-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: category.color ?? "#64748b" }}
                />
                <span className="text-sm font-medium">{category.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                disabled={removingId === category._id}
                onClick={() => handleRemove(category._id)}
                title={
                  category.isDefault
                    ? "Default categories can still be removed if unused"
                    : "Delete category"
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <form className="space-y-3 border-t pt-3" onSubmit={handleCreate}>
          <div className="space-y-2">
            <Label htmlFor="new-category-name">Name</Label>
            <Input
              id="new-category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="design-systems"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-category-color">Color</Label>
            <Input
              id="new-category-color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              placeholder="#64748b"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              Add Category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
