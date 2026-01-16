"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  X,
  Languages,
  BookOpen,
  ScrollText,
  Hash,
  StickyNote,
  GripVertical,
  GraduationCap,
  FileText,
} from "lucide-react";
import RichTextEditor from "@/components/rich-text/RichTextEditor";
import type { JSONContent } from "@/components/rich-text/types";
import { cn } from "@/lib/utils";

interface CollectionFormDialogProps {
  open: boolean;
  onClose: () => void;
  editId?: string;
}

type EntityType = "word" | "verse" | "hadith" | "root" | "note" | "lesson" | "chapter";

interface CollectionItem {
  entityType: string;
  entityId: string;
  order: number;
  annotation?: string;
}

const entityTabs: Array<{
  value: EntityType;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: "word", label: "Word", icon: <Languages className="h-4 w-4" /> },
  { value: "verse", label: "Verse", icon: <BookOpen className="h-4 w-4" /> },
  { value: "hadith", label: "Hadith", icon: <ScrollText className="h-4 w-4" /> },
  { value: "root", label: "Root", icon: <Hash className="h-4 w-4" /> },
  { value: "note", label: "Note", icon: <StickyNote className="h-4 w-4" /> },
  { value: "lesson", label: "Lesson", icon: <GraduationCap className="h-4 w-4" /> },
  { value: "chapter", label: "Chapter", icon: <FileText className="h-4 w-4" /> },
];

// Entity shape for display
interface DisplayItem {
  _id: string;
  text?: string;
  surahNumber?: number;
  ayahStart?: number;
  collection?: string;
  hadithNumber?: string;
  letters?: string;
  latinized?: string;
  title?: string;
}

function getEntityIcon(type: string) {
  switch (type) {
    case "word": return Languages;
    case "verse": return BookOpen;
    case "hadith": return ScrollText;
    case "root": return Hash;
    case "note": return StickyNote;
    case "lesson": return GraduationCap;
    case "chapter": return FileText;
    default: return StickyNote;
  }
}

export default function CollectionFormDialog({
  open,
  onClose,
  editId,
}: CollectionFormDialogProps) {
  const existingCollection = useQuery(
    api.study.collections.getDetail,
    editId ? { id: editId as Id<"collections"> } : "skip"
  );

  const createCollection = useMutation(api.study.collections.create);
  const updateCollection = useMutation(api.study.collections.update);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentJson, setContentJson] = useState<JSONContent | undefined>(undefined);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Item picker state
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<EntityType>("word");
  const [search, setSearch] = useState("");

  // Fetch entities for picker
  const words = useQuery(api.study.words.list, {});
  const verses = useQuery(api.study.verses.list, {});
  const hadiths = useQuery(api.study.hadiths.list, {});
  const roots = useQuery(api.study.roots.list);
  const notes = useQuery(api.study.notes.listStandalone, {});
  const lessons = useQuery(api.study.courses.listAllLessons, {});
  const chapters = useQuery(api.study.books.listAllChapters, {});

  useEffect(() => {
    if (existingCollection) {
      setTitle(existingCollection.collection.title);
      setDescription(existingCollection.collection.description ?? "");
      setContentJson(existingCollection.collection.contentJson);
      setItems(
        existingCollection.items.map((item) => ({
          entityType: item.entityType,
          entityId: item.entityId,
          order: item.order,
          annotation: item.annotation,
        }))
      );
    } else if (!editId) {
      resetForm();
    }
  }, [existingCollection, editId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setContentJson(undefined);
    setItems([]);
    setShowItemPicker(false);
    setSearch("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleContentChange = useCallback((content: JSONContent) => {
    setContentJson(content);
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase().trim();
    const existingIds = new Set(
      items.filter((i) => i.entityType === activeTab).map((i) => i.entityId)
    );

    switch (activeTab) {
      case "word":
        return (words ?? [])
          .filter(
            (w) =>
              !existingIds.has(w._id) &&
              (w.text.includes(search) ||
                w.transliteration?.toLowerCase().includes(query))
          )
          .slice(0, 10);
      case "verse":
        return (verses ?? [])
          .filter(
            (v) =>
              !existingIds.has(v._id) &&
              (v.arabicText.includes(search) ||
                `${v.surahNumber}:${v.ayahStart}`.includes(query))
          )
          .slice(0, 10);
      case "hadith":
        return (hadiths ?? [])
          .filter(
            (h) =>
              !existingIds.has(h._id) &&
              (h.arabicText.includes(search) ||
                h.collection.toLowerCase().includes(query))
          )
          .slice(0, 10);
      case "root":
        return (roots ?? [])
          .filter(
            (r) =>
              !existingIds.has(r._id) &&
              (r.letters.includes(search) ||
                r.latinized.toLowerCase().includes(query))
          )
          .slice(0, 10);
      case "note":
        return (notes ?? [])
          .filter(
            (n) =>
              !existingIds.has(n._id) &&
              (n.title?.toLowerCase().includes(query) ||
                n.content.toLowerCase().includes(query))
          )
          .slice(0, 10);
      case "lesson":
        return (lessons ?? [])
          .filter(
            (l) =>
              !existingIds.has(l._id) && l.title.toLowerCase().includes(query)
          )
          .slice(0, 10);
      case "chapter":
        return (chapters ?? [])
          .filter(
            (c) =>
              !existingIds.has(c._id) && c.title.toLowerCase().includes(query)
          )
          .slice(0, 10);
      default:
        return [];
    }
  }, [activeTab, search, words, verses, hadiths, roots, notes, lessons, chapters, items]);

  const handleAddItem = (item: { _id: string }) => {
    const maxOrder = items.reduce((max, i) => Math.max(max, i.order), -1);
    setItems([
      ...items,
      {
        entityType: activeTab,
        entityId: item._id,
        order: maxOrder + 1,
      },
    ]);
  };

  const handleRemoveItem = (entityType: string, entityId: string) => {
    setItems(
      items.filter(
        (i) => !(i.entityType === entityType && i.entityId === entityId)
      )
    );
  };

  const getDisplayText = (item: DisplayItem, type: string): string => {
    switch (type) {
      case "word":
        return item.text || "Untitled Word";
      case "verse":
        return `${item.surahNumber}:${item.ayahStart}`;
      case "hadith":
        return `${item.collection} #${item.hadithNumber}`;
      case "root":
        return item.letters || item.latinized || "Unknown Root";
      case "note":
        return item.title || "Untitled Note";
      case "lesson":
        return item.title || "Untitled Lesson";
      case "chapter":
        return item.title || "Untitled Chapter";
      default:
        return "Unknown";
    }
  };

  // Get entity info for display in the items list
  const getEntityInfo = (entityType: string, entityId: string) => {
    switch (entityType) {
      case "word":
        return words?.find((w) => w._id === entityId);
      case "verse":
        return verses?.find((v) => v._id === entityId);
      case "hadith":
        return hadiths?.find((h) => h._id === entityId);
      case "root":
        return roots?.find((r) => r._id === entityId);
      case "note":
        return notes?.find((n) => n._id === entityId);
      case "lesson":
        return lessons?.find((l) => l._id === entityId);
      case "chapter":
        return chapters?.find((c) => c._id === entityId);
      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      if (editId) {
        await updateCollection({
          id: editId as Id<"collections">,
          title,
          description: description || undefined,
          contentJson,
          items: items.map((i, idx) => ({ ...i, order: idx })),
        });
      } else {
        await createCollection({
          title,
          description: description || undefined,
          contentJson,
          items: items.map((i, idx) => ({ ...i, order: idx })),
        });
      }
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editId ? "Edit Collection" : "Create Collection"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Collection title"
              required
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this collection"
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Rich Text Introduction */}
          <div>
            <Label>Introduction (optional)</Label>
            <div className="mt-2">
              <RichTextEditor
                value={contentJson}
                onChange={handleContentChange}
                placeholder="Write an introduction or narrative for this collection..."
                enableEntityReferences={true}
                minHeight="150px"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Items ({items.length})</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowItemPicker(!showItemPicker)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            {/* Item Picker */}
            {showItemPicker && (
              <div className="mb-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                {/* Entity Type Tabs */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {entityTabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.value);
                        setSearch("");
                      }}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors",
                        activeTab === tab.value
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600"
                      )}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <Input
                  placeholder={`Search ${activeTab}s...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mb-2"
                />

                {/* Results */}
                <div className="max-h-[150px] overflow-y-auto">
                  {filteredItems.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No results found
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {filteredItems.map((item: DisplayItem) => (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => handleAddItem(item)}
                          className="w-full p-2 text-left text-sm rounded hover:bg-white dark:hover:bg-slate-700 transition-colors"
                        >
                          {getDisplayText(item, activeTab)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Items List */}
            {items.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                <p className="text-sm text-slate-500">No items added yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {items.map((item, idx) => {
                  const entity = getEntityInfo(item.entityType, item.entityId);
                  const Icon = getEntityIcon(item.entityType);
                  return (
                    <div
                      key={`${item.entityType}-${item.entityId}`}
                      className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                    >
                      <GripVertical className="h-4 w-4 text-slate-300 cursor-grab shrink-0" />
                      <span className="text-xs text-slate-400 w-4">{idx + 1}</span>
                      <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="flex-1 text-sm truncate">
                        {entity ? getDisplayText(entity, item.entityType) : "Loading..."}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {item.entityType}
                      </Badge>
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveItem(item.entityType, item.entityId)
                        }
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                      >
                        <X className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !title.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
