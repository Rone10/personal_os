"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, PanelLeftClose, PanelRightClose } from "lucide-react";
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
  | "tags";

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
  | "tag";

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

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Panel toggles */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className="h-8 w-8"
          >
            <PanelLeftClose
              className={`h-4 w-4 transition-transform ${
                leftPanelOpen ? "" : "rotate-180"
              }`}
            />
          </Button>

          {/* Search bar */}
          <div className="flex-1 max-w-2xl">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              searchData={searchData}
              onSelect={(type, id) => {
                navigateTo(
                  type === "word"
                    ? "words"
                    : type === "verse"
                      ? "verses"
                      : type === "hadith"
                        ? "hadiths"
                        : type === "root"
                          ? "roots"
                          : type === "note"
                            ? "notes"
                            : type === "course"
                              ? "courses"
                              : type === "book"
                                ? "books"
                                : "dashboard",
                  type as EntityType,
                  id
                );
                setSearchQuery("");
              }}
            />
          </div>

          {/* View tabs */}
          <Tabs value={view} className="flex-shrink-0">
            <TabsList>
              <TabsTrigger
                value="dashboard"
                onClick={() => navigateTo("dashboard")}
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="flashcards"
                onClick={() => navigateTo("flashcards")}
              >
                Flashcards
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Arabic font size controls */}
          <ArabicFontControls compact />

          {/* Right panel toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="h-8 w-8"
          >
            <PanelRightClose
              className={`h-4 w-4 transition-transform ${
                rightPanelOpen ? "" : "rotate-180"
              }`}
            />
          </Button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Navigation tree */}
        {leftPanelOpen && (
          <div className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
            <NavigationTree
              data={searchData}
              currentView={view}
              currentEntityType={entityType ?? undefined}
              currentEntityId={entityId ?? undefined}
              onNavigate={navigateTo}
            />
          </div>
        )}

        {/* Center panel - Main content */}
        <div className="flex-1 overflow-y-auto">
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

        {/* Right panel - Context (backlinks, tags, explanations) */}
        {rightPanelOpen && entityType && entityId && (
          <div className="w-72 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
            <ContextPanel
              entityType={entityType}
              entityId={entityId}
              onNavigate={navigateTo}
            />
          </div>
        )}
      </div>
    </div>
  );
}
