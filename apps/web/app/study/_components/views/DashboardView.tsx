"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Sparkles,
  Languages,
  BookOpen,
  ScrollText,
  Hash,
  GraduationCap,
  BookText,
  StickyNote,
  ArrowRight,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewType, EntityType } from "../StudyPageClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SearchData = Record<string, any[]>;

interface DashboardViewProps {
  searchData: SearchData;
  onNavigate: (view: ViewType, type?: EntityType, id?: string) => void;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick?: () => void;
}

function StatCard({ icon, label, count, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`study-stat p-4 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="study-icon-badge">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">
            {count}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardView({
  searchData,
  onNavigate,
}: DashboardViewProps) {
  // Get due words for flashcard count
  const dueWords = useQuery(api.study.words.listDue);
  const recentItems = useQuery(api.study.search.getRecentItems, { limit: 5 });

  const dueCount = dueWords?.length ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="study-reveal space-y-2">
        <p className="study-kicker">Overview</p>
        <h1 className="study-title text-3xl md:text-4xl">
          Your study terrain, mapped daily.
        </h1>
        <p className="study-subtitle max-w-2xl">
          Track what you are learning, what needs reinforcement, and where your
          next insights will come from.
        </p>
      </div>

      {/* Flashcard call to action */}
      {dueCount > 0 && (
        <div
          onClick={() => onNavigate("flashcards")}
          className="study-highlight p-6 cursor-pointer study-reveal-delayed"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {dueCount} words due for review
                </h2>
                <p className="text-white/80 text-sm">
                  Practice to strengthen your memory
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              Start Review
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 study-reveal-more">
        <StatCard
          icon={<Hash className="h-5 w-5 text-slate-500" />}
          label="Roots"
          count={searchData.roots.length}
          onClick={() => onNavigate("roots")}
        />
        <StatCard
          icon={<Languages className="h-5 w-5 text-slate-500" />}
          label="Words"
          count={searchData.words.length}
          onClick={() => onNavigate("words")}
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-slate-500" />}
          label="Verses"
          count={searchData.verses.length}
          onClick={() => onNavigate("verses")}
        />
        <StatCard
          icon={<ScrollText className="h-5 w-5 text-slate-500" />}
          label="Hadiths"
          count={searchData.hadiths.length}
          onClick={() => onNavigate("hadiths")}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 study-reveal-more">
        <StatCard
          icon={<GraduationCap className="h-5 w-5 text-slate-500" />}
          label="Courses"
          count={searchData.courses.length}
          onClick={() => onNavigate("courses")}
        />
        <StatCard
          icon={<BookText className="h-5 w-5 text-slate-500" />}
          label="Books"
          count={searchData.books.length}
          onClick={() => onNavigate("books")}
        />
        <StatCard
          icon={<StickyNote className="h-5 w-5 text-slate-500" />}
          label="Notes"
          count={searchData.notes.length}
          onClick={() => onNavigate("notes")}
        />
        <StatCard
          icon={<Tag className="h-5 w-5 text-slate-500" />}
          label="Tags"
          count={searchData.tags.length}
          onClick={() => onNavigate("tags")}
        />
      </div>

      {/* Recent items */}
      <div className="study-card p-6">
        <h2 className="study-title text-lg mb-4">
          Recent Activity
        </h2>
        {recentItems === undefined ? (
          <p className="text-slate-500">Loading...</p>
        ) : recentItems.length === 0 ? (
          <p className="text-slate-500 italic">
            No activity yet. Start by adding a course, note, or study item.
          </p>
        ) : (
          <div className="space-y-2">
            {recentItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() =>
                  onNavigate(
                    item.type === "word"
                      ? "words"
                      : item.type === "verse"
                        ? "verses"
                        : item.type === "hadith"
                          ? "hadiths"
                          : "notes",
                    item.type as EntityType,
                    item.id
                  )
                }
                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                <span className="text-xs uppercase text-slate-400 w-12">
                  {item.type}
                </span>
                <span className="text-slate-700 dark:text-slate-300 truncate">
                  {item.displayText}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
