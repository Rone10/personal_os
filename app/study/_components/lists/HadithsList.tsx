"use client";

import { Plus, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Hadith {
  _id: string;
  collection: string;
  bookName?: string;
  hadithNumber: string;
  grading?: "sahih" | "hasan" | "daif" | "mawdu";
  arabicText: string;
}

interface HadithsListProps {
  hadiths: Hadith[];
  selectedId?: string;
  filterCollection?: string;
  onSelect: (id: string) => void;
  onAdd?: () => void;
}

const gradingColors: Record<string, string> = {
  sahih: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  hasan: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  daif: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  mawdu: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function HadithsList({
  hadiths,
  selectedId,
  filterCollection,
  onSelect,
  onAdd,
}: HadithsListProps) {

  const filteredHadiths = filterCollection
    ? hadiths.filter((h) => h.collection === filterCollection)
    : hadiths;

  // Group by collection
  const groupedHadiths = filteredHadiths.reduce(
    (acc, hadith) => {
      if (!acc[hadith.collection]) acc[hadith.collection] = [];
      acc[hadith.collection].push(hadith);
      return acc;
    },
    {} as Record<string, Hadith[]>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ScrollText className="h-6 w-6 text-slate-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Hadith
            </h1>
            <p className="text-sm text-slate-500">
              {filteredHadiths.length} hadith saved
              {filterCollection && ` from ${filterCollection}`}
            </p>
          </div>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Hadith
        </Button>
      </div>

      {/* Hadith list */}
      {filteredHadiths.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <ScrollText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No hadith saved yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Add hadith to study and reference
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={onAdd}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Hadith
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedHadiths).map(([collection, collectionHadiths]) => (
            <div key={collection}>
              <h2 className="text-sm font-semibold text-slate-500 mb-2">
                {collection} ({collectionHadiths.length})
              </h2>
              <div className="grid gap-2">
                {collectionHadiths.map((hadith) => (
                  <div
                    key={hadith._id}
                    onClick={() => onSelect(hadith._id)}
                    className={cn(
                      "p-4 bg-white dark:bg-slate-800 rounded-lg border cursor-pointer transition-colors",
                      selectedId === hadith._id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <span className="text-sm font-mono text-slate-400">
                          #{hadith.hadithNumber}
                        </span>
                        {hadith.grading && (
                          <Badge
                            className={cn(
                              "ml-2 text-xs",
                              gradingColors[hadith.grading]
                            )}
                          >
                            {hadith.grading}
                          </Badge>
                        )}
                      </div>
                      <p
                        className="font-arabic text-base leading-relaxed text-right flex-1"
                        dir="rtl"
                      >
                        {hadith.arabicText.length > 200
                          ? hadith.arabicText.slice(0, 200) + "..."
                          : hadith.arabicText}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
