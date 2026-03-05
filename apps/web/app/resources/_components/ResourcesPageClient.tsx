"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, FolderTree, Filter, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import ResourcesTable from "./ResourcesTable";
import ResourceTopicDialog from "./ResourceTopicDialog";
import ResourceCategoryDialog from "./ResourceCategoryDialog";
import { Id } from "@/convex/_generated/dataModel";

const resourcesApi = api.resources;

type ResourceCategory = {
  _id: Id<"resourceCategories">;
  name: string;
  color?: string;
  isDefault?: boolean;
};

type ResourceTopic = {
  _id: Id<"resources">;
  title: string;
  description?: string;
  tags?: string[];
  isFavorite: boolean;
  updatedAt: number;
  entriesCount: number;
  category?: ResourceCategory | null;
};

export default function ResourcesPageClient() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | Id<"resourceCategories">>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const categories = (useQuery(resourcesApi.listCategories, {}) ?? []) as ResourceCategory[];
  const topics = useQuery(resourcesApi.listTopics, {
    search: search.trim() || undefined,
    categoryId: categoryFilter === "all" ? undefined : categoryFilter,
    tag: tagFilter.trim().toLowerCase() || undefined,
    favoriteOnly: favoriteOnly || undefined,
  }) as ResourceTopic[] | undefined;

  const seedDefaultCategories = useMutation(resourcesApi.seedDefaultCategories);
  const createTopic = useMutation(resourcesApi.createTopic);
  const toggleFavorite = useMutation(resourcesApi.toggleFavorite);
  const createCategory = useMutation(resourcesApi.createCategory);
  const removeCategory = useMutation(resourcesApi.removeCategory);

  useEffect(() => {
    seedDefaultCategories({});
  }, [seedDefaultCategories]);

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setTopicDialogOpen(true);
    }
  }, [searchParams]);

  if (topics === undefined) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
          <p className="text-sm text-muted-foreground">
            Organize topic-based reference collections with multiple annotated links.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
            <FolderTree className="mr-2 h-4 w-4" />
            Categories
          </Button>
          <Button onClick={() => setTopicDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Topic
          </Button>
        </div>
      </div>

      <section className="rounded-xl border bg-card/50 backdrop-blur-sm p-4 space-y-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="resource-search">Search</Label>
            <Input
              id="resource-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="buttons, docs, arabic..."
            />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select
              value={categoryFilter}
              onValueChange={(value) =>
                setCategoryFilter(
                  value === "all" ? "all" : (value as Id<"resourceCategories">),
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="resource-tag-filter">Tag</Label>
            <Input
              id="resource-tag-filter"
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              placeholder="ui"
            />
          </div>
          <div className="space-y-1">
            <Label>Favorites</Label>
            <Button
              variant={favoriteOnly ? "default" : "outline"}
              className="w-full"
              onClick={() => setFavoriteOnly((prev) => !prev)}
            >
              {favoriteOnly ? "Showing favorites" : "Show favorites only"}
            </Button>
          </div>
        </div>
      </section>

      <ResourcesTable
        topics={topics}
        onToggleFavorite={async (id) => {
          await toggleFavorite({ id });
        }}
      />

      <ResourceTopicDialog
        open={topicDialogOpen}
        onOpenChange={setTopicDialogOpen}
        title="Create Resource Topic"
        description="A topic is a container for multiple URLs and your notes about what each one does."
        submitLabel="Create Topic"
        categories={categories}
        onSubmit={async (values) => {
          await createTopic({
            title: values.title,
            description: values.description || undefined,
            categoryId: values.categoryId,
            tags: values.tags,
          });
        }}
      />

      <ResourceCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        categories={categories}
        onCreate={async (values) => {
          await createCategory(values);
        }}
        onRemove={async (id) => {
          await removeCategory({ id });
        }}
      />
    </div>
  );
}
