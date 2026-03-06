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
import { cn } from "@/lib/utils";

const DEFAULT_COLOR = "#64748b";
const COLOR_PRESETS = [
  "#2563eb",
  "#0891b2",
  "#16a34a",
  "#ea580c",
  "#db2777",
  "#9333ea",
  "#eab308",
  "#0f172a",
  "#334155",
  "#64748b",
  "#94a3b8",
  "#ef4444",
] as const;

function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

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
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<Id<"resourceCategories"> | null>(null);
  const trimmedColor = color.trim();
  const previewColor = isHexColor(trimmedColor) ? trimmedColor : DEFAULT_COLOR;

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
                  style={{ backgroundColor: category.color ?? DEFAULT_COLOR }}
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
            <div className="flex items-center gap-3 rounded-md border bg-muted/25 p-2">
              <span
                className="h-8 w-8 rounded-full border border-slate-300/80 shadow-sm dark:border-slate-700"
                style={{ backgroundColor: previewColor }}
              />
              <div className="text-xs">
                <p className="text-muted-foreground">Preview</p>
                <p className="font-mono text-foreground">{trimmedColor || DEFAULT_COLOR}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                aria-label="Pick category color"
                type="color"
                value={previewColor}
                onChange={(event) => setColor(event.target.value)}
                className="h-10 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
              />
              <div className="grid flex-1 grid-cols-6 gap-2 md:grid-cols-8">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setColor(preset)}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 transition-transform hover:scale-105",
                      previewColor.toLowerCase() === preset.toLowerCase()
                        ? "border-foreground ring-2 ring-offset-2 ring-offset-background"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: preset }}
                    title={preset}
                    aria-label={`Set color ${preset}`}
                  />
                ))}
              </div>
            </div>
            <Input
              id="new-category-color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              placeholder={DEFAULT_COLOR}
            />
            <p className="text-xs text-muted-foreground">
              Pick from presets or enter a hex color manually (e.g. #22c55e).
            </p>
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
