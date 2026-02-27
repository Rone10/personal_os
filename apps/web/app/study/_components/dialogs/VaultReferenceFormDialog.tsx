"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import LinkPicker, { ReferenceType } from "../editor/LinkPicker";
import { VaultReference } from "../vault/types";

type VaultInternalTargetType = NonNullable<VaultReference["targetType"]>;

interface VaultReferenceFormDialogProps {
  open: boolean;
  onClose: () => void;
  entryId: string;
  editReference?: VaultReference;
  onSaved?: () => void;
}

export default function VaultReferenceFormDialog({
  open,
  onClose,
  entryId,
  editReference,
  onSaved,
}: VaultReferenceFormDialogProps) {
  const createReference = useMutation(api.study.vault.createReference);
  const updateReference = useMutation(api.study.vault.updateReference);

  const [referenceType, setReferenceType] = useState<"internal" | "external">("internal");
  const [targetType, setTargetType] = useState<ReferenceType | "">("");
  const [targetId, setTargetId] = useState("");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!editReference) {
      setReferenceType("internal");
      setTargetType("");
      setTargetId("");
      setUrl("");
      setLabel("");
      setNote("");
      return;
    }

    setReferenceType(editReference.referenceType);
    setTargetType((editReference.targetType as ReferenceType) ?? "");
    setTargetId(editReference.targetId ?? "");
    setUrl(editReference.url ?? "");
    setLabel(editReference.label ?? "");
    setNote(editReference.note ?? "");
  }, [editReference, open]);

  const canSubmit =
    label.trim().length > 0 &&
    (referenceType === "external"
      ? url.trim().length > 0
      : targetType.length > 0 && targetId.length > 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSaving(true);
    try {
      if (editReference) {
        await updateReference({
          id: editReference._id as Id<"vaultEntryReferences">,
          referenceType,
          targetType:
            referenceType === "internal"
              ? (targetType as VaultInternalTargetType)
              : undefined,
          targetId: referenceType === "internal" ? targetId : undefined,
          url: referenceType === "external" ? url : undefined,
          label,
          note: note || undefined,
        });
      } else {
        await createReference({
          entryId: entryId as Id<"vaultEntries">,
          referenceType,
          targetType:
            referenceType === "internal"
              ? (targetType as VaultInternalTargetType)
              : undefined,
          targetId: referenceType === "internal" ? targetId : undefined,
          url: referenceType === "external" ? url : undefined,
          label,
          note: note || undefined,
        });
      }

      onSaved?.();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editReference ? "Edit Reference" : "Add Reference"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Reference Type</Label>
              <Select
                value={referenceType}
                onValueChange={(value) =>
                  setReferenceType(value as "internal" | "external")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="external">External URL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {referenceType === "internal" ? (
              <div className="space-y-2">
                <Label>Internal Target</Label>
                <div className="flex gap-2">
                  <Input
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder="Display label"
                  />
                  <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
                    Pick
                  </Button>
                </div>
                {targetType && targetId && (
                  <p className="text-xs text-slate-500">
                    Linked to `{targetType}` ({targetId})
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="vault-ref-url">URL</Label>
                <Input
                  id="vault-ref-url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://..."
                />
                <Label htmlFor="vault-ref-label">Label</Label>
                <Input
                  id="vault-ref-label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Reference label"
                />
              </div>
            )}

            <div>
              <Label htmlFor="vault-ref-note">Note</Label>
              <Textarea
                id="vault-ref-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Optional context for this reference"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editReference ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <LinkPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(selected) => {
          setTargetType(selected.type);
          setTargetId(selected.id);
          if (!label.trim()) {
            setLabel(selected.displayText);
          }
          setPickerOpen(false);
        }}
      />
    </>
  );
}
