"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { VaultEntryType } from "../vault/types";

interface VaultEntryFormDialogProps {
  open: boolean;
  onClose: () => void;
  editId?: string;
  onSaved?: (id: string) => void;
}

export default function VaultEntryFormDialog({
  open,
  onClose,
  editId,
  onSaved,
}: VaultEntryFormDialogProps) {
  const existing = useQuery(
    api.study.vault.getEntryDetail,
    editId ? { id: editId as Id<"vaultEntries"> } : "skip"
  );
  const subjects = useQuery(api.study.vault.listSubjects, {});
  const books = useQuery(api.study.books.listBooks, {});
  const allChapters = useQuery(api.study.books.listAllChapters, {});
  const createEntry = useMutation(api.study.vault.createEntry);
  const updateEntry = useMutation(api.study.vault.updateEntry);

  const [entryType, setEntryType] = useState<VaultEntryType>("word");
  const [text, setText] = useState("");
  const [transliteration, setTransliteration] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [bookId, setBookId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [sourcePage, setSourcePage] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const categories = useQuery(
    api.study.vault.listCategories,
    subjectId ? { subjectId: subjectId as Id<"vaultSubjects"> } : {}
  );
  const topics = useQuery(
    api.study.vault.listTopics,
    categoryId ? { categoryId: categoryId as Id<"vaultCategories"> } : {}
  );

  const chaptersForBook = useMemo(
    () => (allChapters ?? []).filter((chapter) => chapter.bookId === bookId),
    [allChapters, bookId]
  );

  useEffect(() => {
    if (!existing?.entry) return;
    setEntryType(existing.entry.entryType);
    setText(existing.entry.text);
    setTransliteration(existing.entry.transliteration ?? "");
    setSubjectId(existing.entry.subjectId);
    setCategoryId(existing.entry.categoryId);
    setTopicId(existing.entry.topicId);
    setBookId(existing.entry.bookId ?? "");
    setChapterId(existing.entry.chapterId ?? "");
    setSourcePage(existing.entry.sourcePage ?? "");
    setNotes(existing.entry.notes ?? "");
  }, [existing]);

  useEffect(() => {
    if (!editId && open) {
      setEntryType("word");
      setText("");
      setTransliteration("");
      setSubjectId("");
      setCategoryId("");
      setTopicId("");
      setBookId("");
      setChapterId("");
      setSourcePage("");
      setNotes("");
    }
  }, [editId, open]);

  useEffect(() => {
    if (!subjectId) {
      setCategoryId("");
      setTopicId("");
      return;
    }
    if (categories && !categories.some((item) => item._id === categoryId)) {
      setCategoryId("");
      setTopicId("");
    }
  }, [categories, categoryId, subjectId]);

  useEffect(() => {
    if (!categoryId) {
      setTopicId("");
      return;
    }
    if (topics && !topics.some((item) => item._id === topicId)) {
      setTopicId("");
    }
  }, [topics, categoryId, topicId]);

  useEffect(() => {
    if (!bookId) {
      setChapterId("");
      return;
    }
    if (!chaptersForBook.some((chapter) => chapter._id === chapterId)) {
      setChapterId("");
    }
  }, [bookId, chapterId, chaptersForBook]);

  const canSubmit =
    text.trim().length > 0 &&
    subjectId.length > 0 &&
    categoryId.length > 0 &&
    topicId.length > 0;

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSaving(true);
    try {
      if (editId) {
        await updateEntry({
          id: editId as Id<"vaultEntries">,
          entryType,
          text,
          transliteration: transliteration || undefined,
          subjectId: subjectId as Id<"vaultSubjects">,
          categoryId: categoryId as Id<"vaultCategories">,
          topicId: topicId as Id<"vaultTopics">,
          bookId: bookId ? (bookId as Id<"books">) : null,
          chapterId: chapterId ? (chapterId as Id<"chapters">) : null,
          sourcePage: sourcePage || undefined,
          notes: notes || undefined,
        });
        onSaved?.(editId);
      } else {
        const id = await createEntry({
          entryType,
          text,
          transliteration: transliteration || undefined,
          subjectId: subjectId as Id<"vaultSubjects">,
          categoryId: categoryId as Id<"vaultCategories">,
          topicId: topicId as Id<"vaultTopics">,
          bookId: bookId ? (bookId as Id<"books">) : undefined,
          chapterId: chapterId ? (chapterId as Id<"chapters">) : undefined,
          sourcePage: sourcePage || undefined,
          notes: notes || undefined,
        });
        onSaved?.(id);
      }

      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? "Edit Vault Entry" : "Add Vault Entry"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Entry Type *</Label>
              <Select
                value={entryType}
                onValueChange={(value) => setEntryType(value as VaultEntryType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="word">Word</SelectItem>
                  <SelectItem value="phrase">Phrase</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="vault-transliteration">Transliteration</Label>
              <Input
                id="vault-transliteration"
                value={transliteration}
                onChange={(event) => setTransliteration(event.target.value)}
                placeholder="Optional transliteration"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="vault-text">Arabic Text *</Label>
            <Input
              id="vault-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="font-arabic text-lg"
              dir="rtl"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Subject *</Label>
              <Select value={subjectId || "__none__"} onValueChange={(value) => setSubjectId(value === "__none__" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select subject</SelectItem>
                  {(subjects ?? []).map((subject) => (
                    <SelectItem key={subject._id} value={subject._id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category *</Label>
              <Select value={categoryId || "__none__"} onValueChange={(value) => setCategoryId(value === "__none__" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select category</SelectItem>
                  {(categories ?? []).map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Topic *</Label>
              <Select value={topicId || "__none__"} onValueChange={(value) => setTopicId(value === "__none__" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select topic</SelectItem>
                  {(topics ?? []).map((topic) => (
                    <SelectItem key={topic._id} value={topic._id}>
                      {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Book</Label>
              <Select value={bookId || "__none__"} onValueChange={(value) => setBookId(value === "__none__" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional book" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No book</SelectItem>
                  {(books ?? []).map((book) => (
                    <SelectItem key={book._id} value={book._id}>
                      {book.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Chapter</Label>
              <Select value={chapterId || "__none__"} onValueChange={(value) => setChapterId(value === "__none__" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional chapter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No chapter</SelectItem>
                  {chaptersForBook.map((chapter) => (
                    <SelectItem key={chapter._id} value={chapter._id}>
                      {chapter.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="vault-source-page">Page/Source</Label>
              <Input
                id="vault-source-page"
                value={sourcePage}
                onChange={(event) => setSourcePage(event.target.value)}
                placeholder="Optional page"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="vault-notes">Notes</Label>
            <Textarea
              id="vault-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Optional notes"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? "Update Entry" : "Create Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
