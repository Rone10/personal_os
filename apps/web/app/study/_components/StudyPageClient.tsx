"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BookOpen, Loader2, PanelLeftClose, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArabicFontControls } from "@/components/ArabicFontControls";
import NavigationTree from "./NavigationTree";
import MainContent from "./MainContent";
import ContextPanel from "./ContextPanel";
import SearchBar from "./SearchBar";

export type ViewType =
  | "dashboard"
  | "roots"
  | "words"
  | "verses"
  | "hadiths"
  | "courses"
  | "books"
  | "notes"
  | "flashcards"
  | "tags"
  | "collections";

export type EntityType =
  | "root"
  | "word"
  | "verse"
  | "hadith"
  | "course"
  | "lesson"
  | "book"
  | "chapter"
  | "note"
  | "tag"
  | "collection";

export interface ViewState {
  view: ViewType;
  entityType?: EntityType;
  entityId?: string;
  parentId?: string; // For lessons (courseId) or chapters (bookId)
}

export default function StudyPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse URL state
  const view = (searchParams.get("view") as ViewType) ?? "dashboard";
  const entityType = searchParams.get("type") as EntityType | null;
  const entityId = searchParams.get("id");
  const parentId = searchParams.get("parent");

  // UI state
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch search data for navigation
  const searchData = useQuery(api.study.search.getSearchData);

  // Navigation helper
  const navigateTo = useCallback(
    (newView: ViewType, type?: EntityType, id?: string, parent?: string) => {
      const params = new URLSearchParams();
      params.set("view", newView);
      if (type) params.set("type", type);
      if (id) params.set("id", id);
      if (parent) params.set("parent", parent);
      router.push(`/study?${params.toString()}`);
    },
    [router]
  );

  // Loading state
  if (searchData === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const quickStats = [
    { label: "Roots", value: searchData.roots.length },
    { label: "Words", value: searchData.words.length },
    { label: "Verses", value: searchData.verses.length },
    { label: "Hadiths", value: searchData.hadiths.length },
  ];

  return (
    <div className="h-full flex flex-col gap-4 px-4 py-4">
      {/* Top bar */}
      <div className="study-topbar rounded-3xl px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="study-seal">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="study-kicker">Study Center</p>
                <h1 className="study-title text-2xl md:text-3xl">
                  Quranic Knowledge Atelier
                </h1>
                <p className="study-subtitle">
                  Curate vocabulary, verses, and meaning networks with intention.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                className="study-icon-button h-9 w-9"
              >
                <PanelLeftClose
                  className={`h-4 w-4 transition-transform ${
                    leftPanelOpen ? "" : "rotate-180"
                  }`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                className="study-icon-button h-9 w-9"
              >
                <PanelRightClose
                  className={`h-4 w-4 transition-transform ${
                    rightPanelOpen ? "" : "rotate-180"
                  }`}
                />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="flex-1 max-w-3xl">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                searchData={searchData}
                className="study-reveal"
                inputClassName="study-search-input"
                popoverClassName="study-popover"
                onSelect={(type, id) => {
                  const viewMap: Record<string, ViewType> = {
                    word: "words",
                    verse: "verses",
                    hadith: "hadiths",
                    root: "roots",
                    note: "notes",
                    course: "courses",
                    book: "books",
                    tag: "tags",
                    collection: "collections",
                  };
                  navigateTo(
                    viewMap[type] ?? "dashboard",
                    type as EntityType,
                    id
                  );
                  setSearchQuery("");
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="study-panel px-3 py-2">
                <Tabs value={view} className="flex-shrink-0">
                  <TabsList className="study-tabs-list">
                    <TabsTrigger
                      className="study-tabs-trigger"
                      value="dashboard"
                      onClick={() => navigateTo("dashboard")}
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      className="study-tabs-trigger"
                      value="flashcards"
                      onClick={() => navigateTo("flashcards")}
                    >
                      Flashcards
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="study-panel px-3 py-2">
                <ArabicFontControls compact />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickStats.map((stat) => (
              <span key={stat.label} className="study-pill font-medium">
                {stat.value} {stat.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left panel - Navigation tree */}
        {leftPanelOpen && (
          <div className="w-72 flex-shrink-0 overflow-hidden">
            <div className="study-panel study-panel-muted h-full overflow-y-auto">
              <NavigationTree
                data={searchData}
                currentView={view}
                currentEntityType={entityType ?? undefined}
                currentEntityId={entityId ?? undefined}
                onNavigate={navigateTo}
              />
            </div>
          </div>
        )}

        {/* Center panel - Main content */}
        <div className="flex-1 overflow-hidden">
          <div className="study-canvas h-full overflow-y-auto">
            <MainContent
              view={view}
              entityType={entityType ?? undefined}
              entityId={entityId ?? undefined}
              parentId={parentId ?? undefined}
              onNavigate={navigateTo}
              searchQuery={searchQuery}
              searchData={searchData}
            />
          </div>
        </div>

        {/* Right panel - Context (backlinks, tags, explanations) */}
        {rightPanelOpen && entityType && entityId && (
          <div className="w-80 flex-shrink-0 overflow-hidden">
            <div className="study-panel study-panel-muted h-full overflow-y-auto">
              <ContextPanel
                entityType={entityType}
                entityId={entityId}
                onNavigate={navigateTo}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
