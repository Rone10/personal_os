"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import {
  Tag,
  Edit2,
  Trash2,
  Loader2,
  Languages,
  BookOpen,
  ScrollText,
  Hash,
  StickyNote,
  GraduationCap,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityType, ViewType } from "../StudyPageClient";

interface TagDetailProps {
  tagId: string;
  onNavigate: (
    view: ViewType,
    type?: EntityType,
    id?: string,
    parent?: string
  ) => void;
  onEdit: () => void;
}

// Generic entity type for tagged items
interface TaggedEntity {
  _id: string;
  text?: string;
  title?: string;
  name?: string;
  letters?: string;
  latinized?: string;
  surahNumber?: number;
  ayahStart?: number;
  ayahEnd?: number;
  collection?: string;
  hadithNumber?: string;
}

export default function TagDetail({ tagId, onNavigate, onEdit }: TagDetailProps) {
  const tagDetail = useQuery(api.study.tags.getTagDetail, {
    id: tagId as Id<"tags">,
  });
  const deleteTag = useMutation(api.study.tags.remove);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (tagDetail === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (tagDetail === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Tag not found</p>
      </div>
    );
  }

  const { tag, entities, totalCount } = tagDetail;

  const handleDelete = async () => {
    await deleteTag({ id: tagId as Id<"tags"> });
    onNavigate("dashboard");
  };

  const entitySections = [
    {
      type: "word" as const,
      label: "Words",
      icon: Languages,
      items: entities.word,
      view: "words" as ViewType,
    },
    {
      type: "verse" as const,
      label: "Verses",
      icon: BookOpen,
      items: entities.verse,
      view: "verses" as ViewType,
    },
    {
      type: "hadith" as const,
      label: "Hadiths",
      icon: ScrollText,
      items: entities.hadith,
      view: "hadiths" as ViewType,
    },
    {
      type: "root" as const,
      label: "Roots",
      icon: Hash,
      items: entities.root,
      view: "roots" as ViewType,
    },
    {
      type: "note" as const,
      label: "Notes",
      icon: StickyNote,
      items: entities.note,
      view: "notes" as ViewType,
    },
    {
      type: "lesson" as const,
      label: "Lessons",
      icon: GraduationCap,
      items: entities.lesson,
      view: "courses" as ViewType,
    },
    {
      type: "chapter" as const,
      label: "Chapters",
      icon: FileText,
      items: entities.chapter,
      view: "books" as ViewType,
    },
  ];

  // Get display text for an entity
  const getEntityDisplayText = (type: string, item: TaggedEntity): string => {
    switch (type) {
      case "word":
        return item.text || "Untitled Word";
      case "verse":
        return `Surah ${item.surahNumber}:${item.ayahStart}${item.ayahEnd && item.ayahEnd !== item.ayahStart ? `-${item.ayahEnd}` : ""}`;
      case "hadith":
        return `${item.collection} #${item.hadithNumber}`;
      case "root":
        return item.letters || item.latinized || "Untitled Root";
      case "note":
        return item.title || "Untitled Note";
      case "lesson":
        return item.title || "Untitled Lesson";
      case "chapter":
        return item.title || "Untitled Chapter";
      default:
        return item.title || item.name || "Unknown";
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-lg"
            style={{
              backgroundColor: tag.color ? `${tag.color}20` : "#f1f5f9",
            }}
          >
            <Tag
              className="h-6 w-6"
              style={{ color: tag.color ?? "#64748b" }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              #{tag.name}
            </h1>
            <p className="text-slate-500">{totalCount} tagged items</p>
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
      {tag.description && (
        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <p className="text-slate-600 dark:text-slate-400">{tag.description}</p>
        </div>
      )}

      {/* Tagged Entities by Type */}
      <div className="space-y-6">
        {totalCount === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No entities tagged with this tag yet.</p>
            <p className="text-sm mt-1">
              Tag words, verses, hadiths, and more to see them here.
            </p>
          </div>
        ) : (
          entitySections.map(({ type, label, icon: Icon, items, view }) => {
            if (!items || items.length === 0) return null;

            return (
              <div key={type}>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  <Icon className="h-4 w-4" />
                  {label} ({items.length})
                </h2>
                <div className="space-y-2">
                  {items.slice(0, 5).map((item: TaggedEntity) => (
                    <div
                      key={item._id}
                      onClick={() =>
                        onNavigate(view, type as EntityType, item._id)
                      }
                      className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                    >
                      <span className="text-sm font-medium">
                        {getEntityDisplayText(type, item)}
                      </span>
                    </div>
                  ))}
                  {items.length > 5 && (
                    <p className="text-sm text-slate-400 pl-3">
                      +{items.length - 5} more...
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
