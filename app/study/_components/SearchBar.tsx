"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Search,
  Loader2,
  Languages,
  BookOpen,
  ScrollText,
  Hash,
  GraduationCap,
  BookText,
  StickyNote,
  Tag,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { containsArabic } from "@/lib/arabic";
import {
  searchEntities,
  groupResultsByType,
  EntityType,
  SearchResult,
} from "@/lib/search";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SearchData = Record<string, any[]>;

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (type: string, id: string) => void;
  searchData?: SearchData;
  className?: string;
  inputClassName?: string;
  popoverClassName?: string;
}

interface FilterChip {
  type: EntityType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const FILTER_CHIPS: FilterChip[] = [
  {
    type: "word",
    label: "Words",
    icon: <Languages className="h-3 w-3" />,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  {
    type: "root",
    label: "Roots",
    icon: <Hash className="h-3 w-3" />,
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  {
    type: "verse",
    label: "Verses",
    icon: <BookOpen className="h-3 w-3" />,
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  {
    type: "hadith",
    label: "Hadiths",
    icon: <ScrollText className="h-3 w-3" />,
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  {
    type: "course",
    label: "Courses",
    icon: <GraduationCap className="h-3 w-3" />,
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  },
  {
    type: "book",
    label: "Books",
    icon: <BookText className="h-3 w-3" />,
    color:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  },
  {
    type: "note",
    label: "Notes",
    icon: <StickyNote className="h-3 w-3" />,
    color:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  {
    type: "tag",
    label: "Tags",
    icon: <Tag className="h-3 w-3" />,
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
];

const TYPE_LABELS: Record<EntityType, string> = {
  word: "Words",
  verse: "Verses",
  hadith: "Hadiths",
  root: "Roots",
  course: "Courses",
  lesson: "Lessons",
  book: "Books",
  chapter: "Chapters",
  note: "Notes",
  tag: "Tags",
};

export default function SearchBar({
  value,
  onChange,
  onSelect,
  searchData,
  className,
  inputClassName,
  popoverClassName,
}: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<EntityType[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Client-side search using provided data
  const clientResults = useMemo(() => {
    if (!searchData || value.trim().length < 2) return null;
    return searchEntities(
      value,
      searchData,
      activeFilters.length > 0 ? { types: activeFilters } : undefined
    );
  }, [value, searchData, activeFilters]);

  // Fall back to server search if no searchData provided
  const serverResults = useQuery(
    api.study.search.quickSearch,
    !searchData && value.trim().length >= 2
      ? { query: value.trim(), limit: 20 }
      : "skip"
  );

  // Memoize searchResults to avoid dependency issues
  const searchResults = useMemo(
    () => clientResults ?? serverResults ?? [],
    [clientResults, serverResults]
  );

  const groupedResults = useMemo(
    () => groupResultsByType(searchResults as SearchResult[]),
    [searchResults]
  );
  const isLoading = !searchData && serverResults === undefined;

  // Open popover when typing
  useEffect(() => {
    if (value.trim().length >= 2) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [value]);

  const handleSelect = (type: string, id: string) => {
    onSelect(type, id);
    setOpen(false);
  };

  const toggleFilter = (type: EntityType) => {
    setActiveFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setActiveFilters([]);
  };

  // Get result count
  const resultCount = searchResults.length;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Search Input */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search words, verses, hadiths..."
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={cn("pl-9 pr-16 w-full", inputClassName)}
            />
            {value && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 px-2"
                onClick={() => onChange("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className={cn("w-[450px] p-0", popoverClassName)}
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList className="max-h-[400px]">
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                </div>
              ) : searchResults.length === 0 ? (
                <CommandEmpty>No results found</CommandEmpty>
              ) : (
                <>
                  {/* Result count */}
                  <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    {resultCount} result{resultCount !== 1 ? "s" : ""}
                    {activeFilters.length > 0 && (
                      <span>
                        {" "}
                        in {activeFilters.map((t) => TYPE_LABELS[t]).join(", ")}
                      </span>
                    )}
                  </div>

                  {/* Group by type */}
                  {(
                    [
                      "root",
                      "word",
                      "verse",
                      "hadith",
                      "course",
                      "lesson",
                      "book",
                      "chapter",
                      "note",
                      "tag",
                    ] as EntityType[]
                  ).map((type) => {
                    const items = groupedResults[type] || [];
                    if (items.length === 0) return null;

                    return (
                      <CommandGroup key={type} heading={TYPE_LABELS[type]}>
                        {items.slice(0, 5).map((item) => (
                          <CommandItem
                            key={item.id}
                            onSelect={() => handleSelect(item.type, item.id)}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "truncate",
                                    containsArabic(item.displayText)
                                      ? "font-arabic text-right"
                                      : ""
                                  )}
                                  dir={
                                    containsArabic(item.displayText)
                                      ? "rtl"
                                      : "ltr"
                                  }
                                >
                                  {item.displayText}
                                </span>
                                {item.matchType === "exact" && (
                                  <span className="text-[10px] px-1 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded">
                                    exact
                                  </span>
                                )}
                              </div>
                              {item.subtitle && (
                                <span className="text-xs text-slate-500 truncate">
                                  {item.subtitle}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                        {items.length > 5 && (
                          <div className="px-2 py-1 text-xs text-slate-400">
                            +{items.length - 5} more {TYPE_LABELS[type]}
                          </div>
                        )}
                      </CommandGroup>
                    );
                  })}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-1">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.type}
            onClick={() => toggleFilter(chip.type)}
            className={cn(
              "study-chip inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all",
              activeFilters.includes(chip.type)
                ? chip.color + " ring-2 ring-offset-1 ring-slate-400"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            {chip.icon}
            {chip.label}
          </button>
        ))}
        {activeFilters.length > 0 && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
