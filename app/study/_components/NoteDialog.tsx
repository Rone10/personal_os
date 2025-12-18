'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Trash2 } from 'lucide-react';

type OwnerType = 'word' | 'phrase' | 'quran_passage';

/**
 * Single-note editor for a Study entity.
 *
 * Notes are intentionally “personal” and not treated as sources.
 */
export function NoteDialog({
  open,
  onOpenChange,
  ownerType,
  ownerId,
  initialContent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerType: OwnerType;
  ownerId: string;
  initialContent?: string | null;
}) {
  const setNote = useMutation(api.study.setNote);
  const clearNote = useMutation(api.study.clearNote);

  const [content, setContent] = useState(initialContent ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open) setContent(initialContent ?? '');
  }, [initialContent, open]);

  const canSave = useMemo(() => content.trim().length > 0, [content]);

  async function onSave() {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await setNote({ ownerType, ownerId, content: content.trim() });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function onDelete() {
    setIsDeleting(true);
    try {
      await clearNote({ ownerType, ownerId });
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Notes</DialogTitle>
        </DialogHeader>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Your reflections, insights, reminders…"
          className="min-h-40"
        />

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onDelete}
            disabled={isSaving || isDeleting}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-900/20"
          >
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Clear Note
          </Button>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isDeleting}>
              Cancel
            </Button>
            <Button type="button" onClick={onSave} disabled={!canSave || isSaving || isDeleting}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

