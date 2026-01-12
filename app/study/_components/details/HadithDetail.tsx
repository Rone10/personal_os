"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { ScrollText, Edit2, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityType, ViewType } from "../StudyPageClient";

interface HadithDetailProps {
  hadithId: string;
  onNavigate: (
    view: ViewType,
    type?: EntityType,
    id?: string,
    parent?: string
  ) => void;
  onEdit: () => void;
}

export default function HadithDetail({
  hadithId,
  onNavigate,
  onEdit,
}: HadithDetailProps) {
  const hadith = useQuery(api.study.hadiths.getById, {
    id: hadithId as Id<"hadiths">,
  });
  const deleteHadith = useMutation(api.study.hadiths.remove);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (hadith === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (hadith === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Hadith not found</p>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteHadith({ id: hadithId as Id<"hadiths"> });
    onNavigate("hadiths");
  };

  const gradingColors: Record<string, string> = {
    sahih: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    hasan: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    daif: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    mawdu: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <ScrollText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {hadith.collection} #{hadith.hadithNumber}
            </h1>
            {hadith.bookName && (
              <p className="text-slate-500">Book: {hadith.bookName}</p>
            )}
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

      {/* Grading Badge */}
      {hadith.grading && (
        <div className="mb-6">
          <Badge
            className={`${gradingColors[hadith.grading.toLowerCase()] || "bg-slate-100 text-slate-700"} text-sm capitalize`}
          >
            {hadith.grading === "sahih" && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {hadith.grading === "daif" && <AlertCircle className="h-3 w-3 mr-1" />}
            {hadith.grading}
          </Badge>
        </div>
      )}

      {/* Narrator Chain */}
      {hadith.narratorChain && (
        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-l-4 border-amber-500">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Chain of Narration (Isnad)
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 italic">
            {hadith.narratorChain}
          </p>
        </div>
      )}

      {/* Arabic Text */}
      <div className="mb-6 p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
        <p
          className="text-xl md:text-2xl font-arabic leading-loose text-slate-900 dark:text-slate-100 text-right"
          dir="rtl"
        >
          {hadith.arabicText}
        </p>
      </div>

      {/* Translation */}
      {hadith.translation && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Translation
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
            {hadith.translation}
          </p>
        </div>
      )}

      {/* Topic */}
      {hadith.topic && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Topic
          </h2>
          <Badge variant="secondary" className="text-sm">
            {hadith.topic}
          </Badge>
        </div>
      )}

      {/* Metadata */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Collection</span>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {hadith.collection}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Hadith Number</span>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {hadith.hadithNumber}
            </p>
          </div>
          {hadith.bookName && (
            <div className="col-span-2">
              <span className="text-slate-500">Book</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {hadith.bookName}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
