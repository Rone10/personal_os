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

interface RootFormDialogProps {
  open: boolean;
  onClose: () => void;
  editId?: string;
}

export default function RootFormDialog({
  open,
  onClose,
  editId,
}: RootFormDialogProps) {
  const existingRoot = useQuery(
    api.study.roots.getById,
    editId ? { id: editId as Id<"roots"> } : "skip"
  );
  const createRoot = useMutation(api.study.roots.create);
  const updateRoot = useMutation(api.study.roots.update);

  const [letters, setLetters] = useState("");
  const [latinized, setLatinized] = useState("");
  const [coreMeaning, setCoreMeaning] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingRoot) {
      setLetters(existingRoot.letters);
      setLatinized(existingRoot.latinized ?? "");
      setCoreMeaning(existingRoot.coreMeaning);
      setNotes(existingRoot.notes ?? "");
    } else if (!editId) {
      resetForm();
    }
  }, [existingRoot, editId]);

  const resetForm = () => {
    setLetters("");
    setLatinized("");
    setCoreMeaning("");
    setNotes("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!letters.trim() || !coreMeaning.trim()) return;

    setIsSaving(true);
    try {
      // Generate latinized from letters if not provided
      const latinizedValue = latinized.trim() || letters.replace(/[\u0600-\u06FF]/g, (c) => {
        // Basic Arabic to Latin mapping
        const map: Record<string, string> = {
          'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h',
          'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's',
          'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': "'",
          'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm',
          'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y', 'ء': "'", 'ى': 'a',
          'ة': 'h', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ؤ': 'u', 'ئ': 'i',
        };
        return map[c] || '';
      }).replace(/\s+/g, '-').replace(/-+/g, '-');

      if (editId) {
        await updateRoot({
          id: editId as Id<"roots">,
          letters,
          latinized: latinizedValue,
          coreMeaning,
          notes: notes || undefined,
        });
      } else {
        await createRoot({
          letters,
          latinized: latinizedValue,
          coreMeaning,
          notes: notes || undefined,
        });
      }
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editId ? "Edit Root" : "Add Root"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Letters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="letters">Arabic Letters *</Label>
              <Input
                id="letters"
                value={letters}
                onChange={(e) => setLetters(e.target.value)}
                className="font-arabic text-2xl text-center"
                dir="rtl"
                placeholder="ك ت ب"
                required
              />
            </div>
            <div>
              <Label htmlFor="latinized">Latinized Form</Label>
              <Input
                id="latinized"
                value={latinized}
                onChange={(e) => setLatinized(e.target.value)}
                placeholder="k-t-b"
                className="font-mono"
              />
            </div>
          </div>

          {/* Core Meaning */}
          <div>
            <Label htmlFor="coreMeaning">Core Meaning *</Label>
            <Input
              id="coreMeaning"
              value={coreMeaning}
              onChange={(e) => setCoreMeaning(e.target.value)}
              placeholder="e.g., to write"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this root..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !letters.trim() || !coreMeaning.trim()}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
