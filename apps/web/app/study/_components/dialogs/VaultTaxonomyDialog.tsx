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
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

interface VaultTaxonomyDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function VaultTaxonomyDialog({
  open,
  onClose,
}: VaultTaxonomyDialogProps) {
  const subjects = useQuery(api.study.vault.listSubjects, {});
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  const categories = useQuery(
    api.study.vault.listCategories,
    selectedSubjectId
      ? { subjectId: selectedSubjectId as Id<"vaultSubjects"> }
      : {}
  );
  const topics = useQuery(
    api.study.vault.listTopics,
    selectedCategoryId
      ? { categoryId: selectedCategoryId as Id<"vaultCategories"> }
      : {}
  );

  const createSubject = useMutation(api.study.vault.createSubject);
  const updateSubject = useMutation(api.study.vault.updateSubject);
  const removeSubject = useMutation(api.study.vault.removeSubject);

  const createCategory = useMutation(api.study.vault.createCategory);
  const updateCategory = useMutation(api.study.vault.updateCategory);
  const removeCategory = useMutation(api.study.vault.removeCategory);

  const createTopic = useMutation(api.study.vault.createTopic);
  const updateTopic = useMutation(api.study.vault.updateTopic);
  const removeTopic = useMutation(api.study.vault.removeTopic);

  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [renameSubject, setRenameSubject] = useState("");
  const [renameCategory, setRenameCategory] = useState("");
  const [renameTopic, setRenameTopic] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    if (subjects && subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0]._id);
      setRenameSubject(subjects[0].name);
    }
  }, [open, subjects, selectedSubjectId]);

  useEffect(() => {
    if (!categories || categories.length === 0) {
      setSelectedCategoryId("");
      setRenameCategory("");
      return;
    }
    if (!categories.some((item) => item._id === selectedCategoryId)) {
      setSelectedCategoryId(categories[0]._id);
      setRenameCategory(categories[0].name);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (!topics || topics.length === 0) {
      setSelectedTopicId("");
      setRenameTopic("");
      return;
    }
    if (!topics.some((item) => item._id === selectedTopicId)) {
      setSelectedTopicId(topics[0]._id);
      setRenameTopic(topics[0].name);
    }
  }, [topics, selectedTopicId]);

  const selectedSubject = useMemo(
    () => subjects?.find((item) => item._id === selectedSubjectId),
    [subjects, selectedSubjectId]
  );
  const selectedCategory = useMemo(
    () => categories?.find((item) => item._id === selectedCategoryId),
    [categories, selectedCategoryId]
  );
  const selectedTopic = useMemo(
    () => topics?.find((item) => item._id === selectedTopicId),
    [topics, selectedTopicId]
  );

  const withSaving = async (fn: () => Promise<void>) => {
    setIsSaving(true);
    setErrorMessage("");
    try {
      await fn();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update taxonomy"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubject.trim()) return;
    await withSaving(async () => {
      const id = await createSubject({ name: newSubject.trim() });
      setNewSubject("");
      setSelectedSubjectId(id);
      setSelectedCategoryId("");
      setSelectedTopicId("");
    });
  };

  const handleCreateCategory = async () => {
    if (!selectedSubjectId || !newCategory.trim()) return;
    await withSaving(async () => {
      const id = await createCategory({
        subjectId: selectedSubjectId as Id<"vaultSubjects">,
        name: newCategory.trim(),
      });
      setNewCategory("");
      setSelectedCategoryId(id);
      setSelectedTopicId("");
    });
  };

  const handleCreateTopic = async () => {
    if (!selectedSubjectId) {
      setErrorMessage("Select a subject before creating a topic.");
      return;
    }
    if (!selectedCategoryId) {
      setErrorMessage("Select a category before creating a topic.");
      return;
    }
    if (!newTopic.trim()) {
      setErrorMessage("Enter a topic name.");
      return;
    }

    await withSaving(async () => {
      const id = await createTopic({
        subjectId: selectedSubjectId as Id<"vaultSubjects">,
        categoryId: selectedCategoryId as Id<"vaultCategories">,
        name: newTopic.trim(),
      });
      setNewTopic("");
      setSelectedTopicId(id);
      setRenameTopic(newTopic.trim());
    });
  };

  const handleRenameSubject = async () => {
    if (!selectedSubjectId || !renameSubject.trim()) return;
    await withSaving(async () => {
      await updateSubject({
        id: selectedSubjectId as Id<"vaultSubjects">,
        name: renameSubject.trim(),
      });
    });
  };

  const handleRenameCategory = async () => {
    if (!selectedCategoryId || !renameCategory.trim()) return;
    await withSaving(async () => {
      await updateCategory({
        id: selectedCategoryId as Id<"vaultCategories">,
        name: renameCategory.trim(),
      });
    });
  };

  const handleRenameTopic = async () => {
    if (!selectedTopicId || !renameTopic.trim()) return;
    await withSaving(async () => {
      await updateTopic({
        id: selectedTopicId as Id<"vaultTopics">,
        name: renameTopic.trim(),
      });
    });
  };

  const handleDeleteSubject = async () => {
    if (!selectedSubjectId) return;
    await withSaving(async () => {
      await removeSubject({ id: selectedSubjectId as Id<"vaultSubjects"> });
      setSelectedSubjectId("");
    });
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategoryId) return;
    await withSaving(async () => {
      await removeCategory({ id: selectedCategoryId as Id<"vaultCategories"> });
      setSelectedCategoryId("");
    });
  };

  const handleDeleteTopic = async () => {
    if (!selectedTopicId) return;
    await withSaving(async () => {
      await removeTopic({ id: selectedTopicId as Id<"vaultTopics"> });
      setSelectedTopicId("");
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="dialog-width">
        <DialogHeader>
          <DialogTitle>Manage Vault Taxonomy</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <section className="space-y-3">
            <Label>Subjects</Label>
            <div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg p-2">
              {(subjects ?? []).map((subject) => (
                <button
                  key={subject._id}
                  type="button"
                  onClick={() => {
                    setSelectedSubjectId(subject._id);
                    setSelectedCategoryId("");
                    setSelectedTopicId("");
                    setRenameSubject(subject.name);
                    setErrorMessage("");
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                    selectedSubjectId === subject._id
                      ? "bg-slate-200 dark:bg-slate-700"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {subject.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSubject}
                onChange={(event) => setNewSubject(event.target.value)}
                placeholder="New subject"
              />
              <Button type="button" size="icon" onClick={handleCreateSubject}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {selectedSubject && (
              <div className="flex gap-2">
                <Input
                  value={renameSubject}
                  onChange={(event) => setRenameSubject(event.target.value)}
                />
                <Button type="button" size="icon" variant="outline" onClick={handleRenameSubject}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="outline" onClick={handleDeleteSubject}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <Label>Categories</Label>
            <div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg p-2">
              {(categories ?? []).map((category) => (
                <button
                  key={category._id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(category._id);
                    setSelectedTopicId("");
                    setRenameCategory(category.name);
                    setErrorMessage("");
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                    selectedCategoryId === category._id
                      ? "bg-slate-200 dark:bg-slate-700"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="New category"
              />
              <Button type="button" size="icon" onClick={handleCreateCategory} disabled={!selectedSubjectId}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {selectedCategory && (
              <div className="flex gap-2">
                <Input
                  value={renameCategory}
                  onChange={(event) => setRenameCategory(event.target.value)}
                />
                <Button type="button" size="icon" variant="outline" onClick={handleRenameCategory}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="outline" onClick={handleDeleteCategory}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <Label>Topics</Label>
            <div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg p-2">
              {(topics ?? []).map((topic) => (
                <button
                  key={topic._id}
                  type="button"
                  onClick={() => {
                    setSelectedTopicId(topic._id);
                    setRenameTopic(topic.name);
                    setErrorMessage("");
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                    selectedTopicId === topic._id
                      ? "bg-slate-200 dark:bg-slate-700"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {topic.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTopic}
                onChange={(event) => setNewTopic(event.target.value)}
                placeholder="New topic"
              />
              <Button
                type="button"
                size="icon"
                onClick={handleCreateTopic}
                disabled={!selectedSubjectId || !selectedCategoryId}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {selectedTopic && (
              <div className="flex gap-2">
                <Input
                  value={renameTopic}
                  onChange={(event) => setRenameTopic(event.target.value)}
                />
                <Button type="button" size="icon" variant="outline" onClick={handleRenameTopic}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="outline" onClick={handleDeleteTopic}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            )}
          </section>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
