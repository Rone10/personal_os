"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Link2, Tag, MessageSquareText, Loader2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { EntityType, ViewType } from "./StudyPageClient";

// Entity types that support tagging
type TaggableEntityType =
  | "word"
  | "verse"
  | "hadith"
  | "note"
  | "lesson"
  | "chapter"
  | "root"
  | "explanation"
  | "course"
  | "book";

interface ContextPanelProps {
  entityType: EntityType;
  entityId: string;
  onNavigate: (
    view: ViewType,
    type?: EntityType,
    id?: string,
    parent?: string
  ) => void;
}

export default function ContextPanel({
  entityType,
  entityId,
  onNavigate,
}: ContextPanelProps) {
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Get backlinks for this entity
  const backlinks = useQuery(api.study.backlinks.getBacklinksFor, {
    targetType: entityType,
    targetId: entityId,
  });

  // Get tags for this entity
  const tags = useQuery(api.study.tags.getEntityTags, {
    entityType: entityType as TaggableEntityType,
    entityId: entityId,
  });

  // Get all available tags for the user
  const allTags = useQuery(api.study.tags.list);

  // Mutations for tag management
  const tagEntity = useMutation(api.study.tags.tagEntity);
  const untagEntity = useMutation(api.study.tags.untagEntity);
  const createTag = useMutation(api.study.tags.create);

  // Get explanations if applicable
  const explanations = useQuery(
    api.study.explanations.listBySubject,
    entityType === "word" ||
      entityType === "verse" ||
      entityType === "hadith" ||
      entityType === "root"
      ? {
          subjectType: entityType as "word" | "verse" | "hadith" | "root",
          subjectId: entityId,
        }
      : "skip"
  );

  // Filter out already applied tags
  const availableTags =
    allTags?.filter(
      (t) => !tags?.some((existingTag) => existingTag?._id === t._id)
    ) ?? [];

  // Filter by search
  const filteredTags = availableTags.filter((t) =>
    t.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Check if search value matches an existing tag name
  const exactMatch = allTags?.some(
    (t) => t.name.toLowerCase() === searchValue.toLowerCase()
  );

  // Handler to add a tag to current entity
  const handleAddTag = async (tagId: Id<"tags">) => {
    await tagEntity({
      tagId,
      entityType: entityType as TaggableEntityType,
      entityId: entityId,
    });
    setTagPickerOpen(false);
    setSearchValue("");
  };

  // Handler to remove a tag from current entity
  const handleRemoveTag = async (tagId: Id<"tags">) => {
    await untagEntity({
      tagId,
      entityType: entityType as TaggableEntityType,
      entityId: entityId,
    });
  };

  // Handler to create a new tag and add it
  const handleCreateAndAddTag = async () => {
    if (!searchValue.trim()) return;
    const tagId = await createTag({ name: searchValue.trim() });
    await tagEntity({
      tagId,
      entityType: entityType as TaggableEntityType,
      entityId: entityId,
    });
    setSearchValue("");
    setTagPickerOpen(false);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Backlinks Section */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          <Link2 className="h-4 w-4" />
          Backlinks
        </h3>
        {backlinks === undefined ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        ) : backlinks.length === 0 ? (
          <p className="text-sm text-slate-400 italic">
            No notes reference this item
          </p>
        ) : (
          <div className="space-y-2">
            {backlinks.map((bl) => (
              <div
                key={bl._id}
                className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700"
                onClick={() => onNavigate("notes", "note", bl.noteId)}
              >
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                  {bl.noteTitle ?? "Untitled Note"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {bl.snippet}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tags Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Tag className="h-4 w-4" />
            Tags
          </h3>
          <Popover open={tagPickerOpen} onOpenChange={setTagPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Add tag"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search or create tag..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList>
                  <CommandEmpty>
                    {searchValue.trim() && !exactMatch ? (
                      <button
                        className="w-full p-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                        onClick={handleCreateAndAddTag}
                      >
                        <Plus className="h-4 w-4" />
                        Create &quot;{searchValue}&quot;
                      </button>
                    ) : (
                      <p className="p-2 text-sm text-slate-500">No tags found</p>
                    )}
                  </CommandEmpty>
                  {filteredTags.length > 0 && (
                    <CommandGroup heading="Available Tags">
                      {filteredTags.map((tag) => (
                        <CommandItem
                          key={tag._id}
                          onSelect={() => handleAddTag(tag._id)}
                          className="cursor-pointer"
                        >
                          <div
                            className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                            style={{
                              backgroundColor: tag.color ?? "#94a3b8",
                            }}
                          />
                          {tag.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {searchValue.trim() && !exactMatch && filteredTags.length > 0 && (
                    <CommandGroup heading="Create New">
                      <CommandItem
                        onSelect={handleCreateAndAddTag}
                        className="cursor-pointer"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create &quot;{searchValue}&quot;
                      </CommandItem>
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {tags === undefined ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        ) : tags.length === 0 ? (
          <p className="text-sm text-slate-400 italic">
            No tags - click + to add
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tags.filter(Boolean).map((tag) => (
              <Badge
                key={tag!._id}
                variant="secondary"
                className="cursor-pointer group pr-1"
                style={tag!.color ? { backgroundColor: tag!.color } : undefined}
                onClick={() => onNavigate("tags", "tag", tag!._id)}
              >
                {tag!.name}
                <button
                  className="ml-1 opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTag(tag!._id as Id<"tags">);
                  }}
                  title="Remove tag"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </section>

      {/* Explanations Section (only for word/verse/hadith/root) */}
      {(entityType === "word" ||
        entityType === "verse" ||
        entityType === "hadith" ||
        entityType === "root") && (
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            <MessageSquareText className="h-4 w-4" />
            Explanations
          </h3>
          {explanations === undefined ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : explanations.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No explanations</p>
          ) : (
            <div className="space-y-2">
              {explanations.map((exp) => (
                <div
                  key={exp._id}
                  className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {exp.sourceType}
                    </Badge>
                    {exp.sourceLabel && (
                      <span className="text-xs text-slate-500">
                        {exp.sourceLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {exp.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
