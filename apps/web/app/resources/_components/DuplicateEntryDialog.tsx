"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type DuplicateEntry = {
  _id: string;
  label: string;
  url: string;
  purpose: string;
  resourceTitle?: string;
};

interface DuplicateEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: DuplicateEntry[];
  onConfirmAddAnyway: () => Promise<void>;
}

export default function DuplicateEntryDialog({
  open,
  onOpenChange,
  duplicates,
  onConfirmAddAnyway,
}: DuplicateEntryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate URL Found</DialogTitle>
          <DialogDescription>
            This URL already exists in your resources. You can still add it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-52 overflow-y-auto">
          {duplicates.map((duplicate) => (
            <div key={duplicate._id} className="rounded-md border p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium truncate">{duplicate.label}</p>
                <Badge variant="outline">{duplicate.resourceTitle ?? "Unknown topic"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{duplicate.url}</p>
              <p className="text-xs mt-1">{duplicate.purpose}</p>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirmAddAnyway}>Add Anyway</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
