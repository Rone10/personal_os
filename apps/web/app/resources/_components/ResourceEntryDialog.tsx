"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type EntryValues = {
  url: string;
  label: string;
  purpose: string;
};

interface ResourceEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EntryValues) => Promise<void>;
  title: string;
  description: string;
  submitLabel: string;
  initialValues?: EntryValues;
}

export default function ResourceEntryDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  description,
  submitLabel,
  initialValues,
}: ResourceEntryDialogProps) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [purpose, setPurpose] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUrl(initialValues?.url ?? "");
    setLabel(initialValues?.label ?? "");
    setPurpose(initialValues?.purpose ?? "");
  }, [open, initialValues]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ url, label, purpose });
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
            <Label htmlFor="resource-entry-url">URL</Label>
            <Input
              id="resource-entry-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/components/buttons"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resource-entry-label">Label</Label>
            <Input
              id="resource-entry-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Acme UI buttons docs"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resource-entry-purpose">What it does</Label>
            <Textarea
              id="resource-entry-purpose"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="Detailed API docs and accessibility guidance for buttons"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
