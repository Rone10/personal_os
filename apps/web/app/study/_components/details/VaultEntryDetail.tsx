"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  Edit2,
  ExternalLink,
  Hash,
  Link2,
  Loader2,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityType, ViewType } from "../StudyPageClient";
import VaultEntryFormDialog from "../dialogs/VaultEntryFormDialog";
import VaultReferenceFormDialog from "../dialogs/VaultReferenceFormDialog";
import { VaultReference } from "../vault/types";
import { ResourceTargetLinker } from "@/components/ResourceTargetLinker";

interface VaultEntryDetailProps {
  entryId: string;
  onNavigate: (
    view: ViewType,
    type?: EntityType,
    id?: string,
    parent?: string
  ) => void;
}

interface TagItem {
  _id: string;
  name: string;
}

function getInternalView(targetType?: string): ViewType {
  switch (targetType) {
    case "word":
      return "words";
    case "verse":
      return "verses";
    case "hadith":
      return "hadiths";
    case "root":
      return "roots";
    case "lesson":
    case "course":
      return "courses";
    case "chapter":
    case "book":
      return "books";
    case "tag":
      return "tags";
    case "note":
      return "notes";
    case "collection":
      return "collections";
    case "vaultEntry":
      return "vault";
    default:
      return "dashboard";
  }
}

function getTargetLabel(reference: VaultReference): string {
  if (reference.referenceType === "external") {
    return reference.label;
  }

  const target = reference.target as Record<string, unknown> | null | undefined;
  if (!target) {
    return reference.label;
  }

  if (reference.targetType === "word") {
    return String(target.text ?? reference.label);
  }
  if (reference.targetType === "verse") {
    return `${target.surahNumber}:${target.ayahStart}`;
  }
  if (reference.targetType === "hadith") {
    return `${target.collection} #${target.hadithNumber}`;
  }
  if (reference.targetType === "root") {
    return String(target.letters ?? reference.label);
  }
  if (reference.targetType === "vaultEntry") {
    return String(target.text ?? reference.label);
  }
  if (reference.targetType === "tag") {
    return `#${target.name ?? reference.label}`;
  }

  return String(target.title ?? reference.label);
}

export default function VaultEntryDetail({
  entryId,
  onNavigate,
}: VaultEntryDetailProps) {
  const detail = useQuery(api.study.vault.getEntryDetail, {
    id: entryId as Id<"vaultEntries">,
  });
  const allTags = useQuery(api.study.tags.list, {});

  const removeEntry = useMutation(api.study.vault.removeEntry);
  const removeReference = useMutation(api.study.vault.removeReference);
  const tagEntity = useMutation(api.study.tags.tagEntity);
  const untagEntity = useMutation(api.study.tags.untagEntity);

  const [editOpen, setEditOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [editingReference, setEditingReference] = useState<VaultReference | undefined>();
  const [selectedTagId, setSelectedTagId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const currentTags = useMemo(() => {
    const raw = (detail?.tags ?? []) as Array<TagItem | null>;
    return raw.filter(Boolean) as TagItem[];
  }, [detail?.tags]);

  const availableTags = useMemo(() => {
    const currentTagIds = new Set(currentTags.map((tag) => String(tag._id)));
    const raw = (allTags ?? []) as Array<TagItem | null>;
    return raw.filter(
      (tag) => Boolean(tag) && !currentTagIds.has(String((tag as TagItem)._id))
    ) as TagItem[];
  }, [allTags, currentTags]);

  if (detail === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (detail === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Vault entry not found</p>
      </div>
    );
  }

  const { entry, subject, category, topic, book, chapter, references } = detail;

  const handleDelete = async () => {
    await removeEntry({ id: entryId as Id<"vaultEntries"> });
    onNavigate("vault");
  };

  const handleAddTag = async () => {
    if (!selectedTagId) return;
    await tagEntity({
      tagId: selectedTagId as Id<"tags">,
      entityType: "vaultEntry",
      entityId: entryId,
    });
    setSelectedTagId("");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        onClick={() => onNavigate("vault")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Vault
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {entry.entryType}
          </p>
          <h1 className="font-arabic text-3xl mt-1" dir="rtl">
            {entry.text}
          </h1>
          {entry.transliteration && (
            <p className="text-slate-500 mt-1">{entry.transliteration}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="destructive" onClick={handleDelete}>
                Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="study-card p-3">
          <p className="text-xs text-slate-500">Subject</p>
          <p className="font-medium">{subject?.name ?? "-"}</p>
        </div>
        <div className="study-card p-3">
          <p className="text-xs text-slate-500">Category</p>
          <p className="font-medium">{category?.name ?? "-"}</p>
        </div>
        <div className="study-card p-3">
          <p className="text-xs text-slate-500">Topic</p>
          <p className="font-medium">{topic?.name ?? "-"}</p>
        </div>
      </div>

      <div className="study-card p-4">
        <p className="text-sm font-semibold mb-2">Source</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {book
            ? `${book.title}${chapter ? ` / ${chapter.title}` : ""}${entry.sourcePage ? ` (p.${entry.sourcePage})` : ""}`
            : "No source linked"}
        </p>
      </div>

      <ResourceTargetLinker
        scope="study"
        studyEntityType="vaultEntry"
        studyEntityId={entryId}
        title="Linked Resources"
      />

      <div className="study-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {currentTags.map((tag) => (
            <Badge key={tag._id} variant="secondary" className="gap-1">
              #{tag.name}
              <button
                type="button"
                onClick={() =>
                  untagEntity({
                    tagId: tag._id as Id<"tags">,
                    entityType: "vaultEntry",
                    entityId: entryId,
                  })
                }
                className="text-slate-500 hover:text-red-500"
              >
                ×
              </button>
            </Badge>
          ))}
          {currentTags.length === 0 && (
            <p className="text-sm text-slate-500">No tags attached.</p>
          )}
        </div>

        <div className="flex gap-2">
          <Select value={selectedTagId || "__none__"} onValueChange={(value) => setSelectedTagId(value === "__none__" ? "" : value)}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Add tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select tag</SelectItem>
              {availableTags.map((tag) => (
                <SelectItem key={tag._id} value={tag._id}>
                  #{tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={handleAddTag} disabled={!selectedTagId}>
            <Hash className="h-4 w-4 mr-2" />
            Attach
          </Button>
        </div>
      </div>

      <div className="study-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            References
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingReference(undefined);
              setReferenceOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {(references ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No references yet.</p>
        ) : (
          <div className="space-y-2">
            {(references as VaultReference[]).map((reference) => (
              <div
                key={reference._id}
                className="p-3 rounded border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{getTargetLabel(reference)}</p>
                    <p className="text-xs text-slate-500">
                      {reference.referenceType === "external"
                        ? "External"
                        : `Internal · ${reference.targetType}`}
                    </p>
                    {reference.note && (
                      <p className="text-xs text-slate-500 mt-1">{reference.note}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {reference.referenceType === "internal" &&
                      reference.targetType &&
                      reference.targetId && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            onNavigate(
                              getInternalView(reference.targetType),
                              reference.targetType as EntityType,
                              reference.targetId
                            )
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    {reference.referenceType === "external" && reference.url && (
                      <a href={reference.url} target="_blank" rel="noreferrer">
                        <Button size="icon" variant="ghost">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingReference(reference);
                        setReferenceOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        removeReference({
                          id: reference._id as Id<"vaultEntryReferences">,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {entry.notes && (
        <div className="study-card p-4">
          <h2 className="text-sm font-semibold mb-2">Notes</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
            {entry.notes}
          </p>
        </div>
      )}

      <VaultEntryFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editId={entryId}
      />

      <VaultReferenceFormDialog
        open={referenceOpen}
        onClose={() => setReferenceOpen(false)}
        entryId={entryId}
        editReference={editingReference}
      />
    </div>
  );
}
