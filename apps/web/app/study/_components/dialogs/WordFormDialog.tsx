"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface WordFormDialogProps {
  open: boolean;
  onClose: () => void;
  editId?: string;
}

interface Meaning {
  definition: string;
  usageContext?: string;
  examples?: string[];
}

export default function WordFormDialog({
  open,
  onClose,
  editId,
}: WordFormDialogProps) {
  const existingWord = useQuery(
    api.study.words.getById,
    editId ? { id: editId as Id<"words"> } : "skip"
  );
  const roots = useQuery(api.study.roots.list);
  const createWord = useMutation(api.study.words.create);
  const updateWord = useMutation(api.study.words.update);

  const [text, setText] = useState("");
  const [transliteration, setTransliteration] = useState("");
  const [type, setType] = useState<"harf" | "ism" | "fiil" | "">("");
  const [wazan, setWazan] = useState("");
  const [rootId, setRootId] = useState("");
  const [language, setLanguage] = useState<"arabic" | "english">("arabic");
  const [grammaticalInfo, setGrammaticalInfo] = useState("");
  const [meanings, setMeanings] = useState<Meaning[]>([{ definition: "" }]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingWord) {
      setText(existingWord.text);
      setTransliteration(existingWord.transliteration ?? "");
      setType((existingWord.type as "harf" | "ism" | "fiil") ?? "");
      setWazan(existingWord.wazan ?? "");
      setRootId(existingWord.rootId ?? "");
      setLanguage(existingWord.language ?? "arabic");
      // grammaticalInfo is an object in schema, store as empty string for now
      setGrammaticalInfo("");
      setMeanings(
        existingWord.meanings.length > 0
          ? existingWord.meanings.map(m => ({
              definition: m.definition,
              usageContext: m.usageContext,
              examples: m.examples,
            }))
          : [{ definition: "" }]
      );
    } else if (!editId) {
      resetForm();
    }
  }, [existingWord, editId]);

  const resetForm = () => {
    setText("");
    setTransliteration("");
    setType("");
    setWazan("");
    setRootId("");
    setLanguage("arabic");
    setGrammaticalInfo("");
    setMeanings([{ definition: "" }]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addMeaning = () => {
    setMeanings([...meanings, { definition: "" }]);
  };

  const updateMeaning = (index: number, field: keyof Meaning, value: string) => {
    const newMeanings = [...meanings];
    if (field === "examples") {
      newMeanings[index].examples = value.split("\n").filter(Boolean);
    } else {
      newMeanings[index][field] = value;
    }
    setMeanings(newMeanings);
  };

  const removeMeaning = (index: number) => {
    if (meanings.length > 1) {
      setMeanings(meanings.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSaving(true);
    try {
      const validMeanings = meanings.filter((m) => m.definition.trim());

      if (editId) {
        await updateWord({
          id: editId as Id<"words">,
          text,
          transliteration: transliteration || undefined,
          type: type || undefined,
          wazan: wazan || undefined,
          rootId: rootId ? (rootId as Id<"roots">) : undefined,
          language,
          meanings: validMeanings,
        });
      } else {
        await createWord({
          text,
          transliteration: transliteration || undefined,
          type: type || undefined,
          wazan: wazan || undefined,
          rootId: rootId ? (rootId as Id<"roots">) : undefined,
          language,
          meanings: validMeanings,
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
          <DialogTitle>{editId ? "Edit Word" : "Add Word"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Arabic Text */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="text">Arabic Text *</Label>
              <Input
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="font-arabic text-lg"
                dir="rtl"
                required
              />
            </div>
            <div>
              <Label htmlFor="transliteration">Transliteration</Label>
              <Input
                id="transliteration"
                value={transliteration}
                onChange={(e) => setTransliteration(e.target.value)}
                placeholder="e.g., kitaab"
              />
            </div>
          </div>

          {/* Type and Wazan */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Word Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "harf" | "ism" | "fiil" | "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ism">Noun (اسم)</SelectItem>
                  <SelectItem value="fiil">Verb (فعل)</SelectItem>
                  <SelectItem value="harf">Particle (حرف)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="wazan">Pattern (Wazan)</Label>
              <Input
                id="wazan"
                value={wazan}
                onChange={(e) => setWazan(e.target.value)}
                className="font-arabic"
                dir="rtl"
                placeholder="e.g., فَعَلَ"
              />
            </div>
            <div>
              <Label>Language</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as "arabic" | "english")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arabic">Arabic</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Root Selection */}
          <div>
            <Label>Root</Label>
            <Select
              value={rootId || "__none__"}
              onValueChange={(v) => setRootId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select root (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {roots?.map((root) => (
                  <SelectItem key={root._id} value={root._id}>
                    <span className="font-arabic">{root.letters}</span>
                    <span className="text-slate-400 ml-2">
                      ({root.coreMeaning})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Meanings */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Meanings</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMeaning}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Meaning
              </Button>
            </div>
            <div className="space-y-3">
              {meanings.map((meaning, index) => (
                <div
                  key={index}
                  className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={meaning.definition}
                        onChange={(e) =>
                          updateMeaning(index, "definition", e.target.value)
                        }
                        placeholder="Definition"
                      />
                      <Input
                        value={meaning.usageContext ?? ""}
                        onChange={(e) =>
                          updateMeaning(index, "usageContext", e.target.value)
                        }
                        placeholder="Usage context (optional)"
                      />
                    </div>
                    {meanings.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMeaning(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grammatical Info */}
          <div>
            <Label htmlFor="grammaticalInfo">Grammatical Notes</Label>
            <Textarea
              id="grammaticalInfo"
              value={grammaticalInfo}
              onChange={(e) => setGrammaticalInfo(e.target.value)}
              placeholder="Additional grammatical information..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !text.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
