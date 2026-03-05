"use client";

import { useEffect, useMemo, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Category = {
  _id: Id<"resourceCategories">;
  name: string;
};

type TopicValues = {
  title: string;
  description?: string;
  categoryId: Id<"resourceCategories">;
  tags?: string[];
};

interface ResourceTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TopicValues) => Promise<void>;
  categories: Category[];
  title: string;
  description: string;
  submitLabel: string;
  initialValues?: TopicValues;
}

export default function ResourceTopicDialog({
  open,
  onOpenChange,
  onSubmit,
  categories,
  title,
  description,
  submitLabel,
  initialValues,
}: ResourceTopicDialogProps) {
  const firstCategoryId = useMemo(() => categories[0]?._id, [categories]);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [categoryId, setCategoryId] = useState<Id<"resourceCategories"> | "">("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTopicTitle(initialValues?.title ?? "");
    setTopicDescription(initialValues?.description ?? "");
    setCategoryId(initialValues?.categoryId ?? firstCategoryId ?? "");
    setTags(initialValues?.tags?.join(", ") ?? "");
  }, [open, initialValues, firstCategoryId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (!categoryId) return;
      await onSubmit({
        title: topicTitle,
        description: topicDescription,
        categoryId: categoryId as Id<"resourceCategories">,
        tags: tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="resource-topic-title">Title</Label>
            <Input
              id="resource-topic-title"
              value={topicTitle}
              onChange={(event) => setTopicTitle(event.target.value)}
              placeholder="Buttons"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-topic-description">Description</Label>
            <Textarea
              id="resource-topic-description"
              value={topicDescription}
              onChange={(event) => setTopicDescription(event.target.value)}
              placeholder="Curated references for reusable button systems"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={categoryId}
              onValueChange={(value) =>
                setCategoryId(value as Id<"resourceCategories">)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-topic-tags">Tags (comma-separated)</Label>
            <Input
              id="resource-topic-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="ui, shadcn, tailwind"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !categoryId}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
