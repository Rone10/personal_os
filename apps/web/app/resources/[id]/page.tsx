"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ResourceTopicDialog from "../_components/ResourceTopicDialog";
import ResourceEntryDialog from "../_components/ResourceEntryDialog";
import DuplicateEntryDialog from "../_components/DuplicateEntryDialog";
import ResourceAssociationsPanel from "../_components/ResourceAssociationsPanel";
import { Id } from "@/convex/_generated/dataModel";

const resourcesApi = api.resources;

type EntryValues = {
  url: string;
  label: string;
  purpose: string;
};

type ResourceCategory = {
  _id: Id<"resourceCategories">;
  name: string;
};

type ResourceEntry = {
  _id: Id<"resourceEntries">;
  url: string;
  label: string;
  purpose: string;
  order: number;
};

type ResourceDetail = {
  resource: {
    _id: Id<"resources">;
    title: string;
    description?: string;
    categoryId: Id<"resourceCategories">;
    tags?: string[];
  };
  category?: ResourceCategory | null;
  entries: ResourceEntry[];
  projectLinks: Array<{ _id: string }>;
  studyLinks: Array<{ _id: string }>;
};

type DuplicateEntry = {
  _id: Id<"resourceEntries">;
  label: string;
  url: string;
  purpose: string;
  resourceTitle?: string;
};

export default function ResourceTopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const resourceId = params.id as Id<"resources">;

  const detail = useQuery(resourcesApi.getTopicDetail, { id: resourceId }) as
    | ResourceDetail
    | null
    | undefined;
  const categories = (useQuery(resourcesApi.listCategories, {}) ?? []) as ResourceCategory[];

  const updateTopic = useMutation(resourcesApi.updateTopic);
  const removeTopic = useMutation(resourcesApi.removeTopic);
  const addEntry = useMutation(resourcesApi.addEntry);
  const updateEntry = useMutation(resourcesApi.updateEntry);
  const removeEntry = useMutation(resourcesApi.removeEntry);
  const reorderEntries = useMutation(resourcesApi.reorderEntries);

  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ResourceEntry | null>(null);
  const [confirmDeleteTopic, setConfirmDeleteTopic] = useState(false);
  const [duplicateUrl, setDuplicateUrl] = useState<string | null>(null);
  const [pendingEntryAction, setPendingEntryAction] = useState<{
    mode: "create" | "update";
    values: EntryValues;
    entryId?: Id<"resourceEntries">;
  } | null>(null);

  const duplicateResults = useQuery(
    resourcesApi.findDuplicateEntries,
    duplicateUrl ? { url: duplicateUrl } : "skip",
  ) as DuplicateEntry[] | undefined;

  const entryRows = useMemo<ResourceEntry[]>(() => {
    if (!detail?.entries) return [];
    return [...detail.entries].sort((a, b) => a.order - b.order);
  }, [detail]);

  if (detail === undefined) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-muted-foreground">Resource topic not found.</p>
        <Link href="/resources" className="text-sm underline">
          Back to resources
        </Link>
      </div>
    );
  }

  async function handleEntrySubmit(values: EntryValues) {
    try {
      if (editingEntry) {
        await updateEntry({
          id: editingEntry._id,
          ...values,
        });
      } else {
        await addEntry({
          resourceId,
          ...values,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("DUPLICATE_URL")) {
        setDuplicateUrl(values.url);
        setPendingEntryAction({
          mode: editingEntry ? "update" : "create",
          values,
          entryId: editingEntry?._id,
        });
        setDuplicateDialogOpen(true);
        return;
      }
      throw error;
    } finally {
      setEditingEntry(null);
    }
  }

  async function moveEntry(entryId: Id<"resourceEntries">, direction: "up" | "down") {
    const currentIds = entryRows.map((entry) => entry._id);
    const currentIndex = currentIds.findIndex((id) => id === entryId);
    if (currentIndex < 0) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentIds.length) return;

    const next = [...currentIds];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, moved);

    await reorderEntries({
      resourceId,
      entryIds: next,
    });
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <Link
        href="/resources"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Resources
      </Link>

      <section className="rounded-xl border bg-card/50 backdrop-blur-sm p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{detail.resource.title}</h1>
              <Badge variant="outline">{detail.category?.name ?? "No category"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {detail.resource.description || "No description"}
            </p>
            <div className="flex flex-wrap gap-1">
              {detail.resource.tags?.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-[11px]">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTopicDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Topic
            </Button>
            {confirmDeleteTopic ? (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await removeTopic({ id: resourceId });
                    router.push("/resources");
                  }}
                >
                  Confirm Delete
                </Button>
                <Button variant="outline" onClick={() => setConfirmDeleteTopic(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setConfirmDeleteTopic(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card/50 backdrop-blur-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Topic Links
          </h2>
          <Button
            onClick={() => {
              setEditingEntry(null);
              setEntryDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Link
          </Button>
        </div>

        <div className="space-y-2">
          {entryRows.length ? (
            entryRows.map((entry, index) => (
              <div key={entry._id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{entry.label}</span>
                      <a href={entry.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{entry.url}</p>
                    <p className="text-sm">{entry.purpose}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === 0}
                      onClick={() => moveEntry(entry._id, "up")}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === entryRows.length - 1}
                      onClick={() => moveEntry(entry._id, "down")}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingEntry(entry);
                        setEntryDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeEntry({ id: entry._id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No links yet. Add the first site for this resource topic.
            </p>
          )}
        </div>
      </section>

      <ResourceAssociationsPanel resourceId={resourceId} />

      <ResourceTopicDialog
        open={topicDialogOpen}
        onOpenChange={setTopicDialogOpen}
        title="Edit Resource Topic"
        description="Update topic metadata."
        submitLabel="Save Changes"
        categories={categories}
        initialValues={{
          title: detail.resource.title,
          description: detail.resource.description,
          categoryId: detail.resource.categoryId,
          tags: detail.resource.tags,
        }}
        onSubmit={async (values) => {
          await updateTopic({
            id: resourceId,
            title: values.title,
            description: values.description || undefined,
            categoryId: values.categoryId,
            tags: values.tags,
          });
        }}
      />

      <ResourceEntryDialog
        open={entryDialogOpen}
        onOpenChange={(open) => {
          setEntryDialogOpen(open);
          if (!open) setEditingEntry(null);
        }}
        title={editingEntry ? "Edit Link" : "Add Link"}
        description="Save a URL and what it’s useful for inside this topic."
        submitLabel={editingEntry ? "Save Link" : "Add Link"}
        initialValues={
          editingEntry
            ? {
                url: editingEntry.url,
                label: editingEntry.label,
                purpose: editingEntry.purpose,
              }
            : undefined
        }
        onSubmit={handleEntrySubmit}
      />

      <DuplicateEntryDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        duplicates={duplicateResults ?? []}
        onConfirmAddAnyway={async () => {
          if (!pendingEntryAction) return;
          if (pendingEntryAction.mode === "create") {
            await addEntry({
              resourceId,
              ...pendingEntryAction.values,
              allowDuplicate: true,
            });
          } else if (pendingEntryAction.entryId) {
            await updateEntry({
              id: pendingEntryAction.entryId,
              ...pendingEntryAction.values,
              allowDuplicate: true,
            });
          }
          setPendingEntryAction(null);
          setDuplicateDialogOpen(false);
          setEditingEntry(null);
        }}
      />
    </div>
  );
}
