"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  FolderOpen,
  Edit2,
  Trash2,
  Loader2,
  Languages,
  BookOpen,
  ScrollText,
  Hash,
  StickyNote,
  GripVertical,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityType, ViewType } from "../StudyPageClient";
import RichTextViewer from "@/components/rich-text/RichTextViewer";

interface CollectionDetailProps {
  collectionId: string;
  onNavigate: (
    view: ViewType,
    type?: EntityType,
    id?: string,
    parent?: string
  ) => void;
  onEdit: () => void;
}

// Get icon for entity type
function getEntityIcon(type: string) {
  switch (type) {
    case "word":
      return Languages;
    case "verse":
      return BookOpen;
    case "hadith":
      return ScrollText;
    case "root":
      return Hash;
    case "note":
      return StickyNote;
    default:
      return StickyNote;
  }
}

// Get display text for an entity
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getEntityDisplayText(entity: Record<string, any> | null | undefined, entityType: string): string {
  if (!entity) return "Unknown";
  switch (entityType) {
    case "word":
      return entity.text || "Untitled Word";
    case "verse":
      return `${entity.surahNumber}:${entity.ayahStart}${entity.ayahEnd && entity.ayahEnd !== entity.ayahStart ? `-${entity.ayahEnd}` : ""}`;
    case "hadith":
      return `${entity.collection} #${entity.hadithNumber}`;
    case "root":
      return entity.letters || entity.latinized || "Unknown Root";
    case "note":
      return entity.title || "Untitled Note";
    case "lesson":
      return entity.title || "Untitled Lesson";
    case "chapter":
      return entity.title || "Untitled Chapter";
    default:
      return entity.title || entity.name || "Unknown";
  }
}

// Map entity type to view type
function getViewType(entityType: string): ViewType {
  switch (entityType) {
    case "word":
      return "words";
    case "verse":
      return "verses";
    case "hadith":
      return "hadiths";
    case "root":
      return "roots";
    case "note":
      return "notes";
    case "lesson":
      return "courses";
    case "chapter":
      return "books";
    default:
      return "dashboard";
  }
}

export default function CollectionDetail({
  collectionId,
  onNavigate,
  onEdit,
}: CollectionDetailProps) {
  const collectionDetail = useQuery(api.study.collections.getDetail, {
    id: collectionId as Id<"collections">,
  });
  const deleteCollection = useMutation(api.study.collections.remove);
  const removeItem = useMutation(api.study.collections.removeItem);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (collectionDetail === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (collectionDetail === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Collection not found</p>
      </div>
    );
  }

  const { collection, items, tags } = collectionDetail;

  const handleDelete = async () => {
    await deleteCollection({ id: collectionId as Id<"collections"> });
    onNavigate("collections");
  };

  const handleRemoveItem = async (entityType: string, entityId: string) => {
    await removeItem({
      collectionId: collectionId as Id<"collections">,
      entityType,
      entityId,
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <FolderOpen className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {collection.title}
            </h1>
            <p className="text-slate-500">
              {items.length} item{items.length !== 1 ? "s" : ""} in this collection
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Confirm
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      {collection.description && (
        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <p className="text-slate-600 dark:text-slate-400">
            {collection.description}
          </p>
        </div>
      )}

      {/* Rich Text Introduction */}
      {collection.contentJson && (
        <div className="mb-6 prose prose-slate dark:prose-invert max-w-none">
          <RichTextViewer
            content={collection.contentJson}
            onEntityClick={(ref) => {
              const viewType = getViewType(ref.targetType);
              onNavigate(viewType, ref.targetType as EntityType, ref.targetId);
            }}
          />
        </div>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {tags
            .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
            .map((tag) => (
              <Badge
                key={tag._id}
                variant="secondary"
                className="cursor-pointer"
                style={tag.color ? { backgroundColor: tag.color } : undefined}
                onClick={() => onNavigate("tags", "tag", tag._id)}
              >
                #{tag.name}
              </Badge>
            ))}
        </div>
      )}

      {/* Collection Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Items
          </h2>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
            <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No items in this collection yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Edit this collection to add words, verses, hadiths, and more
            </p>
            <Button variant="outline" className="mt-4" onClick={onEdit}>
              <Plus className="h-4 w-4 mr-2" />
              Add Items
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => {
              const Icon = getEntityIcon(item.entityType);
              return (
                <div
                  key={`${item.entityType}-${item.entityId}`}
                  className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 shrink-0">
                      <GripVertical className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab" />
                      <span className="text-xs text-slate-400 w-5 text-right">
                        {index + 1}
                      </span>
                    </div>
                    <Icon className="h-4 w-4 text-slate-400 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div
                        className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                        onClick={() =>
                          onNavigate(
                            getViewType(item.entityType),
                            item.entityType as EntityType,
                            item.entityId
                          )
                        }
                      >
                        <span className="font-medium">
                          {getEntityDisplayText(item.entity, item.entityType)}
                        </span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {item.entityType}
                        </Badge>
                      </div>
                      {item.annotation && (
                        <p className="text-sm text-slate-500 mt-1">
                          {item.annotation}
                        </p>
                      )}
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity shrink-0"
                      onClick={() =>
                        handleRemoveItem(item.entityType, item.entityId)
                      }
                      title="Remove from collection"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
