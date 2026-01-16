"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import {
  Loader2,
  Languages,
  ScrollText,
  BookOpen,
  Hash,
  Link2,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LinkableEntityType = "word" | "verse" | "hadith" | "root" | "note";
type RelationshipType =
  | "related"
  | "synonym"
  | "antonym"
  | "explains"
  | "derived_from"
  | "contrasts"
  | "supports"
  | "example_of";

interface EntityLinkFormDialogProps {
  open: boolean;
  onClose: () => void;
  sourceType: LinkableEntityType;
  sourceId: string;
}

const relationshipOptions: Array<{ value: RelationshipType; label: string; description: string }> = [
  { value: "related", label: "Related", description: "General relationship" },
  { value: "synonym", label: "Synonym", description: "Same or similar meaning" },
  { value: "antonym", label: "Antonym", description: "Opposite meaning" },
  { value: "explains", label: "Explains", description: "One explains the other" },
  { value: "derived_from", label: "Derived from", description: "Derivation relationship" },
  { value: "contrasts", label: "Contrasts", description: "Shows contrast" },
  { value: "supports", label: "Supports", description: "Supporting evidence" },
  { value: "example_of", label: "Example of", description: "Instance or example" },
];

const tabConfig: Array<{
  value: LinkableEntityType;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: "word", label: "Word", icon: <Languages className="h-4 w-4" /> },
  { value: "verse", label: "Verse", icon: <BookOpen className="h-4 w-4" /> },
  { value: "hadith", label: "Hadith", icon: <ScrollText className="h-4 w-4" /> },
  { value: "root", label: "Root", icon: <Hash className="h-4 w-4" /> },
  { value: "note", label: "Note", icon: <StickyNote className="h-4 w-4" /> },
];

export default function EntityLinkFormDialog({
  open,
  onClose,
  sourceType,
  sourceId,
}: EntityLinkFormDialogProps) {
  const [activeTab, setActiveTab] = useState<LinkableEntityType>("word");
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<{
    type: LinkableEntityType;
    id: string;
    displayText: string;
  } | null>(null);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("related");
  const [linkNote, setLinkNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const createEntityLink = useMutation(api.study.entityLinks.create);

  // Fetch all entity types
  const words = useQuery(api.study.words.list, {});
  const verses = useQuery(api.study.verses.list, {});
  const hadiths = useQuery(api.study.hadiths.list, {});
  const roots = useQuery(api.study.roots.list);
  const notes = useQuery(api.study.notes.listStandalone, {});

  // Reset search when tab changes
  useEffect(() => {
    setSearch("");
  }, [activeTab]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab("word");
      setSearch("");
      setSelectedEntity(null);
      setRelationshipType("related");
      setLinkNote("");
    }
  }, [open]);

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase().trim();

    switch (activeTab) {
      case "word":
        return (words ?? [])
          .filter(
            (w) =>
              // Don't show self
              !(sourceType === "word" && w._id === sourceId) &&
              (w.text.includes(search) ||
                w.transliteration?.toLowerCase().includes(query) ||
                w.meanings.some((m) => m.definition.toLowerCase().includes(query)))
          )
          .slice(0, 15);
      case "verse":
        return (verses ?? [])
          .filter(
            (v) =>
              !(sourceType === "verse" && v._id === sourceId) &&
              (v.arabicText.includes(search) ||
                `${v.surahNumber}:${v.ayahStart}`.includes(query))
          )
          .slice(0, 15);
      case "hadith":
        return (hadiths ?? [])
          .filter(
            (h) =>
              !(sourceType === "hadith" && h._id === sourceId) &&
              (h.arabicText.includes(search) ||
                h.collection.toLowerCase().includes(query) ||
                h.hadithNumber.includes(query))
          )
          .slice(0, 15);
      case "root":
        return (roots ?? [])
          .filter(
            (r) =>
              !(sourceType === "root" && r._id === sourceId) &&
              (r.letters.includes(search) ||
                r.latinized.toLowerCase().includes(query) ||
                r.coreMeaning.toLowerCase().includes(query))
          )
          .slice(0, 15);
      case "note":
        return (notes ?? [])
          .filter(
            (n) =>
              !(sourceType === "note" && n._id === sourceId) &&
              (n.title?.toLowerCase().includes(query) ||
                n.content.toLowerCase().includes(query))
          )
          .slice(0, 15);
      default:
        return [];
    }
  }, [activeTab, search, words, verses, hadiths, roots, notes, sourceType, sourceId]);

  const handleSelect = (item: unknown) => {
    let displayText = "";
    let id = "";

    switch (activeTab) {
      case "word": {
        const word = item as { _id: string; text: string };
        displayText = word.text;
        id = word._id;
        break;
      }
      case "verse": {
        const verse = item as {
          _id: string;
          surahNumber: number;
          ayahStart: number;
          ayahEnd?: number;
        };
        displayText = verse.ayahEnd
          ? `${verse.surahNumber}:${verse.ayahStart}-${verse.ayahEnd}`
          : `${verse.surahNumber}:${verse.ayahStart}`;
        id = verse._id;
        break;
      }
      case "hadith": {
        const hadith = item as {
          _id: string;
          collection: string;
          hadithNumber: string;
        };
        displayText = `${hadith.collection} #${hadith.hadithNumber}`;
        id = hadith._id;
        break;
      }
      case "root": {
        const root = item as { _id: string; letters: string };
        displayText = root.letters;
        id = root._id;
        break;
      }
      case "note": {
        const note = item as { _id: string; title?: string };
        displayText = note.title ?? "Untitled Note";
        id = note._id;
        break;
      }
    }

    setSelectedEntity({ type: activeTab, id, displayText });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity) return;

    setIsSaving(true);
    try {
      await createEntityLink({
        sourceType,
        sourceId,
        targetType: selectedEntity.type,
        targetId: selectedEntity.id,
        relationshipType,
        note: linkNote.trim() || undefined,
      });
      onClose();
    } catch (error) {
      console.error("Failed to create link:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading =
    words === undefined ||
    verses === undefined ||
    hadiths === undefined ||
    roots === undefined ||
    notes === undefined;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Add Entity Link
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Entity Selection */}
          {!selectedEntity ? (
            <>
              {/* Type Selection */}
              <div className="flex flex-wrap gap-1">
                {tabConfig.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveTab(tab.value)}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors",
                      activeTab === tab.value
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
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
                autoFocus
              />

              {/* Results */}
              <div className="max-h-[200px] overflow-y-auto border rounded-lg">
                {filteredItems.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    ) : (
                      <p>No results found</p>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredItems.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={cn(
                          "w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50",
                          "focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/50"
                        )}
                        onClick={() => handleSelect(item)}
                      >
                        {activeTab === "word" && (
                          <WordItem
                            word={
                              item as {
                                text: string;
                                transliteration?: string;
                                meanings: Array<{ definition: string }>;
                              }
                            }
                          />
                        )}
                        {activeTab === "verse" && (
                          <VerseItem
                            verse={
                              item as {
                                surahNumber: number;
                                ayahStart: number;
                                ayahEnd?: number;
                                arabicText: string;
                              }
                            }
                          />
                        )}
                        {activeTab === "hadith" && (
                          <HadithItem
                            hadith={
                              item as {
                                collection: string;
                                hadithNumber: string;
                                arabicText: string;
                              }
                            }
                          />
                        )}
                        {activeTab === "root" && (
                          <RootItem
                            root={
                              item as {
                                letters: string;
                                latinized: string;
                                coreMeaning: string;
                              }
                            }
                          />
                        )}
                        {activeTab === "note" && (
                          <NoteItem
                            note={item as { title?: string; content: string }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Selected Entity */}
              <div>
                <Label className="text-xs text-slate-500">Link to</Label>
                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg mt-1">
                  <div className="flex items-center gap-2">
                    {tabConfig.find((t) => t.value === selectedEntity.type)?.icon}
                    <span className="font-medium">{selectedEntity.displayText}</span>
                    <span className="text-xs text-slate-500 capitalize">
                      ({selectedEntity.type})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEntity(null)}
                  >
                    Change
                  </Button>
                </div>
              </div>

              {/* Relationship Type */}
              <div>
                <Label htmlFor="relationshipType">Relationship Type</Label>
                <Select
                  value={relationshipType}
                  onValueChange={(v) => setRelationshipType(v as RelationshipType)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {relationshipOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          <span className="text-xs text-slate-500">
                            {opt.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Note */}
              <div>
                <Label htmlFor="linkNote">Note (optional)</Label>
                <Textarea
                  id="linkNote"
                  value={linkNote}
                  onChange={(e) => setLinkNote(e.target.value)}
                  placeholder="Why are these entities linked?"
                  className="mt-1"
                  rows={2}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Link
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Item components for display
function WordItem({
  word,
}: {
  word: {
    text: string;
    transliteration?: string;
    meanings: Array<{ definition: string }>;
  };
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="font-arabic text-lg">{word.text}</span>
        {word.transliteration && (
          <span className="text-sm text-slate-400">({word.transliteration})</span>
        )}
      </div>
      {word.meanings[0] && (
        <p className="text-sm text-slate-500 truncate">
          {word.meanings[0].definition}
        </p>
      )}
    </div>
  );
}

function VerseItem({
  verse,
}: {
  verse: {
    surahNumber: number;
    ayahStart: number;
    ayahEnd?: number;
    arabicText: string;
  };
}) {
  return (
    <div>
      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
        {verse.surahNumber}:{verse.ayahStart}
        {verse.ayahEnd && verse.ayahEnd !== verse.ayahStart && `-${verse.ayahEnd}`}
      </span>
      <p className="font-arabic text-sm truncate mt-1" dir="rtl">
        {verse.arabicText.slice(0, 80)}...
      </p>
    </div>
  );
}

function HadithItem({
  hadith,
}: {
  hadith: { collection: string; hadithNumber: string; arabicText: string };
}) {
  return (
    <div>
      <span className="text-sm font-medium text-green-600 dark:text-green-400">
        {hadith.collection} #{hadith.hadithNumber}
      </span>
      <p className="font-arabic text-sm truncate mt-1" dir="rtl">
        {hadith.arabicText.slice(0, 80)}...
      </p>
    </div>
  );
}

function RootItem({
  root,
}: {
  root: { letters: string; latinized: string; coreMeaning: string };
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-arabic text-xl">{root.letters}</span>
      <div>
        <span className="font-mono text-sm text-slate-400">{root.latinized}</span>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {root.coreMeaning}
        </p>
      </div>
    </div>
  );
}

function NoteItem({ note }: { note: { title?: string; content: string } }) {
  return (
    <div>
      <span className="font-medium text-yellow-600 dark:text-yellow-400">
        {note.title ?? "Untitled Note"}
      </span>
      <p className="text-sm text-slate-500 truncate">
        {note.content.slice(0, 60)}
        {note.content.length > 60 && "..."}
      </p>
    </div>
  );
}
