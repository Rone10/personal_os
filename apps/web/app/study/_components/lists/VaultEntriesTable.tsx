"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Plus, Settings2 } from "lucide-react";
import VaultEntryFormDialog from "../dialogs/VaultEntryFormDialog";
import VaultTaxonomyDialog from "../dialogs/VaultTaxonomyDialog";
import { VaultEntryRow } from "../vault/types";

interface VaultEntriesTableProps {
  selectedId?: string;
  onSelect: (id: string) => void;
}

export default function VaultEntriesTable({
  selectedId,
  onSelect,
}: VaultEntriesTableProps) {
  const [search, setSearch] = useState("");
  const [entryType, setEntryType] = useState<"word" | "phrase" | "all">("all");
  const [subjectId, setSubjectId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [tagId, setTagId] = useState("");
  const [bookId, setBookId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [taxonomyOpen, setTaxonomyOpen] = useState(false);

  const subjects = useQuery(api.study.vault.listSubjects, {});
  const categories = useQuery(
    api.study.vault.listCategories,
    subjectId ? { subjectId: subjectId as Id<"vaultSubjects"> } : {}
  );
  const topics = useQuery(
    api.study.vault.listTopics,
    categoryId ? { categoryId: categoryId as Id<"vaultCategories"> } : {}
  );
  const tags = useQuery(api.study.tags.list, {});
  const books = useQuery(api.study.books.listBooks, {});
  const chapters = useQuery(api.study.books.listAllChapters, {});

  const chapterOptions = useMemo(
    () => (chapters ?? []).filter((chapter) => !bookId || chapter.bookId === bookId),
    [chapters, bookId]
  );

  const queryArgs = useMemo(
    () => ({
      ...(entryType !== "all" ? { entryType } : {}),
      ...(subjectId ? { subjectId: subjectId as Id<"vaultSubjects"> } : {}),
      ...(categoryId ? { categoryId: categoryId as Id<"vaultCategories"> } : {}),
      ...(topicId ? { topicId: topicId as Id<"vaultTopics"> } : {}),
      ...(tagId ? { tagId: tagId as Id<"tags"> } : {}),
      ...(bookId ? { bookId: bookId as Id<"books"> } : {}),
      ...(chapterId ? { chapterId: chapterId as Id<"chapters"> } : {}),
      ...(search.trim() ? { query: search.trim() } : {}),
    }),
    [entryType, subjectId, categoryId, topicId, tagId, bookId, chapterId, search]
  );

  const entries = useQuery(api.study.vault.listEntries, queryArgs) as
    | VaultEntryRow[]
    | undefined;

  const resetDependentFilters = (nextSubjectId: string) => {
    setSubjectId(nextSubjectId);
    setCategoryId("");
    setTopicId("");
  };

  const resetCategory = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    setTopicId("");
  };

  const resetBook = (nextBookId: string) => {
    setBookId(nextBookId);
    setChapterId("");
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Arabic Knowledge Vault
          </h1>
          <p className="text-sm text-slate-500">
            Table-first word and phrase vault with taxonomy-based navigation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTaxonomyOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Manage Taxonomy
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Quick Add Entry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-8 gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search text..."
          className="md:col-span-2"
        />

        <Select value={entryType} onValueChange={(value) => setEntryType(value as "word" | "phrase" | "all")}>
          <SelectTrigger>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="word">Word</SelectItem>
            <SelectItem value="phrase">Phrase</SelectItem>
          </SelectContent>
        </Select>

        <Select value={subjectId || "__all__"} onValueChange={(value) => resetDependentFilters(value === "__all__" ? "" : value)}>
          <SelectTrigger>
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Subjects</SelectItem>
            {(subjects ?? []).map((subject) => (
              <SelectItem key={subject._id} value={subject._id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryId || "__all__"} onValueChange={(value) => resetCategory(value === "__all__" ? "" : value)}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Categories</SelectItem>
            {(categories ?? []).map((category) => (
              <SelectItem key={category._id} value={category._id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={topicId || "__all__"} onValueChange={(value) => setTopicId(value === "__all__" ? "" : value)}>
          <SelectTrigger>
            <SelectValue placeholder="Topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Topics</SelectItem>
            {(topics ?? []).map((topic) => (
              <SelectItem key={topic._id} value={topic._id}>
                {topic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tagId || "__all__"} onValueChange={(value) => setTagId(value === "__all__" ? "" : value)}>
          <SelectTrigger>
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Tags</SelectItem>
            {(tags ?? []).map((tag) => (
              <SelectItem key={tag._id} value={tag._id}>
                #{tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={bookId || "__all__"} onValueChange={(value) => resetBook(value === "__all__" ? "" : value)}>
          <SelectTrigger>
            <SelectValue placeholder="Book" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Books</SelectItem>
            {(books ?? []).map((book) => (
              <SelectItem key={book._id} value={book._id}>
                {book.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={chapterId || "__all__"} onValueChange={(value) => setChapterId(value === "__all__" ? "" : value)}>
          <SelectTrigger>
            <SelectValue placeholder="Chapter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Chapters</SelectItem>
            {chapterOptions.map((chapter) => (
              <SelectItem key={chapter._id} value={chapter._id}>
                {chapter.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arabic Text</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>References</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(entries ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                  No vault entries found for current filters.
                </TableCell>
              </TableRow>
            ) : (
              (entries ?? []).map((entry) => (
                <TableRow
                  key={entry._id}
                  onClick={() => onSelect(entry._id)}
                  className={cn(
                    "cursor-pointer",
                    selectedId === entry._id && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                >
                  <TableCell className="font-arabic text-lg" dir="rtl">
                    {entry.text}
                  </TableCell>
                  <TableCell className="capitalize">{entry.entryType}</TableCell>
                  <TableCell>{entry.subject?.name ?? "-"}</TableCell>
                  <TableCell>{entry.category?.name ?? "-"}</TableCell>
                  <TableCell>{entry.topic?.name ?? "-"}</TableCell>
                  <TableCell className="max-w-36 truncate">
                    {(entry.tags ?? []).map((tag) => `#${tag.name}`).join(", ") || "-"}
                  </TableCell>
                  <TableCell className="max-w-40 truncate">
                    {entry.book?.title
                      ? `${entry.book.title}${entry.chapter?.title ? ` / ${entry.chapter.title}` : ""}${entry.sourcePage ? ` (p.${entry.sourcePage})` : ""}`
                      : "-"}
                  </TableCell>
                  <TableCell>{entry.referencesCount ?? 0}</TableCell>
                  <TableCell>
                    {new Date(entry.updatedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <VaultEntryFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(id) => onSelect(id)}
      />

      <VaultTaxonomyDialog
        open={taxonomyOpen}
        onClose={() => setTaxonomyOpen(false)}
      />
    </div>
  );
}

