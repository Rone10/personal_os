"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FolderKanban, GraduationCap, Link2, X } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

const resourcesApi = api.resources;

type StudySearchResult = {
  type:
    | "word"
    | "root"
    | "verse"
    | "hadith"
    | "course"
    | "lesson"
    | "book"
    | "chapter"
    | "note"
    | "tag"
    | "collection"
    | "vaultEntry";
  id: string;
  displayText: string;
  subtitle?: string;
};
type StudyEntityType = StudySearchResult["type"];

interface ResourceAssociationsPanelProps {
  resourceId: Id<"resources">;
}

type ProjectLink = {
  _id: string;
  projectId: Id<"projects">;
  project?: { name?: string } | null;
};

type StudyEntityRecord = Record<string, unknown>;

type StudyLink = {
  _id: string;
  studyEntityType: StudySearchResult["type"];
  studyEntityId: string;
  entity?: StudyEntityRecord | null;
};

type TopicDetail = {
  projectLinks: ProjectLink[];
  studyLinks: StudyLink[];
};

function readString(record: StudyEntityRecord | undefined | null, key: string): string {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function displayStudyLink(studyLink: StudyLink): string {
  const type = studyLink.studyEntityType as string;
  const entity = studyLink.entity;
  if (!entity) return `${type}: ${studyLink.studyEntityId}`;

  switch (type) {
    case "word":
      return readString(entity, "text");
    case "root":
      return readString(entity, "letters");
    case "verse":
      return `${String(entity.surahNumber)}:${String(entity.ayahStart)}`;
    case "hadith":
      return `${readString(entity, "collection")} #${readString(entity, "hadithNumber")}`;
    case "course":
    case "lesson":
    case "book":
    case "chapter":
    case "collection":
      return readString(entity, "title");
    case "note":
      return readString(entity, "title") || "Untitled Note";
    case "tag":
      return `#${readString(entity, "name")}`;
    case "vaultEntry":
      return readString(entity, "text");
    default:
      return `${type}: ${studyLink.studyEntityId}`;
  }
}

export default function ResourceAssociationsPanel({
  resourceId,
}: ResourceAssociationsPanelProps) {
  const detail = useQuery(resourcesApi.getTopicDetail, { id: resourceId }) as
    | TopicDetail
    | null
    | undefined;
  const activeProjectsQuery = useQuery(api.projects.get, { status: "active" });
  const ideaProjectsQuery = useQuery(api.projects.get, { status: "idea" });

  const linkToProject = useMutation(resourcesApi.linkToProject);
  const unlinkFromProject = useMutation(resourcesApi.unlinkFromProject);
  const linkToStudyEntity = useMutation(resourcesApi.linkToStudyEntity);
  const unlinkFromStudyEntity = useMutation(resourcesApi.unlinkFromStudyEntity);

  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | "">("");
  const [selectedStudyType, setSelectedStudyType] = useState<StudyEntityType>("word");
  const [studyQuery, setStudyQuery] = useState("");
  const [isLinkingProject, setIsLinkingProject] = useState(false);
  const [linkingStudyKey, setLinkingStudyKey] = useState<string | null>(null);

  const scopedStudyQuery = useMemo(() => {
    const query = studyQuery.trim();
    return `__type:${selectedStudyType}__${query ? ` ${query}` : ""}`;
  }, [selectedStudyType, studyQuery]);

  const searchResults = useQuery(
    resourcesApi.searchStudyEntities,
    { query: scopedStudyQuery, limit: 12 },
  ) as StudySearchResult[] | undefined;

  const projects = useMemo(() => {
    const activeProjects = activeProjectsQuery ?? [];
    const ideaProjects = ideaProjectsQuery ?? [];
    const map = new Map<string, { _id: string; name: string }>();
    for (const project of [...activeProjects, ...ideaProjects]) {
      map.set(project._id, project);
    }
    return Array.from(map.values());
  }, [activeProjectsQuery, ideaProjectsQuery]);

  const linkedProjectIds = useMemo(
    () => new Set((detail?.projectLinks ?? []).map((projectLink) => projectLink.projectId)),
    [detail?.projectLinks],
  );

  const availableProjects = useMemo(
    () => projects.filter((project) => !linkedProjectIds.has(project._id as Id<"projects">)),
    [projects, linkedProjectIds],
  );

  const linkedStudyKeys = useMemo(
    () =>
      new Set(
        (detail?.studyLinks ?? []).map(
          (studyLink) => `${studyLink.studyEntityType}:${studyLink.studyEntityId}`,
        ),
      ),
    [detail?.studyLinks],
  );

  const attachableStudyResults = useMemo(
    () =>
      (searchResults ?? []).filter(
        (result) => !linkedStudyKeys.has(`${result.type}:${result.id}`),
      ),
    [searchResults, linkedStudyKeys],
  );

  useEffect(() => {
    if (
      selectedProjectId &&
      !availableProjects.some((project) => project._id === selectedProjectId)
    ) {
      setSelectedProjectId("");
    }
  }, [availableProjects, selectedProjectId]);

  async function handleAddProject() {
    if (!selectedProjectId) return;
    setIsLinkingProject(true);
    try {
      await linkToProject({
        resourceId,
        projectId: selectedProjectId as Id<"projects">,
      });
      setSelectedProjectId("");
    } finally {
      setIsLinkingProject(false);
    }
  }

  if (detail === undefined) {
    return (
      <section className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Loading associations…</p>
      </section>
    );
  }

  if (!detail) return null;

  return (
    <section className="rounded-xl border bg-card p-4 space-y-5">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Topic Associations
        </h2>
      </div>

      <div className="space-y-3 rounded-lg border border-sky-200/70 bg-sky-50/50 p-3 dark:border-sky-900/70 dark:bg-sky-950/20">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <h3 className="text-sm font-medium text-sky-900 dark:text-sky-100">Projects</h3>
        </div>
        {availableProjects.length ? (
          <div className="flex gap-2">
            <Select
              value={selectedProjectId}
              onValueChange={(value) => setSelectedProjectId(value as Id<"projects">)}
            >
              <SelectTrigger className="max-w-sm border-sky-200 bg-white/80 dark:border-sky-900 dark:bg-sky-950/30">
                <SelectValue placeholder="Choose project" />
              </SelectTrigger>
              <SelectContent>
                {availableProjects.map((project) => (
                  <SelectItem key={project._id} value={project._id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddProject}
              disabled={!selectedProjectId || isLinkingProject}
              className="bg-sky-700 text-white hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              Attach
            </Button>
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-sky-300/80 bg-white/70 px-3 py-2 text-xs text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300">
            All available projects are already linked.
          </p>
        )}

        <div className="space-y-2">
          {detail.projectLinks.length ? (
            detail.projectLinks.map((projectLink) => (
              <div
                key={projectLink._id}
                className="flex items-center justify-between rounded-md border border-sky-200/80 bg-white/80 px-3 py-2 dark:border-sky-900 dark:bg-sky-950/30"
              >
                <span className="text-sm text-sky-900 dark:text-sky-100">
                  {projectLink.project?.name ?? "Unknown project"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-sky-700 hover:bg-sky-100 hover:text-sky-900 dark:text-sky-300 dark:hover:bg-sky-900/70 dark:hover:text-sky-100"
                  onClick={() =>
                    unlinkFromProject({
                      resourceId,
                      projectId: projectLink.projectId as Id<"projects">,
                    })
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No linked projects yet.</p>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-emerald-200/70 bg-emerald-50/45 p-3 dark:border-emerald-900/70 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            Study Entities
          </h3>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <Select
            value={selectedStudyType}
            onValueChange={(value) => setSelectedStudyType(value as StudyEntityType)}
          >
            <SelectTrigger className="border-emerald-200 bg-white/80 dark:border-emerald-900 dark:bg-emerald-950/30">
              <SelectValue placeholder="Select entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="word">Word</SelectItem>
              <SelectItem value="root">Root</SelectItem>
              <SelectItem value="verse">Verse</SelectItem>
              <SelectItem value="hadith">Hadith</SelectItem>
              <SelectItem value="course">Course</SelectItem>
              <SelectItem value="lesson">Lesson</SelectItem>
              <SelectItem value="book">Book</SelectItem>
              <SelectItem value="chapter">Chapter</SelectItem>
              <SelectItem value="note">Note</SelectItem>
              <SelectItem value="tag">Tag</SelectItem>
              <SelectItem value="collection">Collection</SelectItem>
              <SelectItem value="vaultEntry">Vault Entry</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={studyQuery}
            onChange={(event) => setStudyQuery(event.target.value)}
            placeholder={`Filter ${selectedStudyType}s (optional)`}
            className="border-emerald-200 bg-white/80 dark:border-emerald-900 dark:bg-emerald-950/30"
          />
        </div>

        <div className="space-y-2 max-h-44 overflow-y-auto rounded-md border border-emerald-200/80 bg-white/70 p-2 dark:border-emerald-900 dark:bg-emerald-950/25">
          {searchResults === undefined ? (
            <p className="text-xs text-muted-foreground">Loading {selectedStudyType} items…</p>
          ) : attachableStudyResults.length ? (
            attachableStudyResults.map((result) => {
              const key = `${result.type}:${result.id}`;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-md border border-emerald-200/80 bg-white/90 px-2 py-1.5 dark:border-emerald-900 dark:bg-emerald-950/35"
                >
                  <div>
                    <p className="text-sm text-emerald-900 dark:text-emerald-100">
                      {result.displayText}
                    </p>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-300/85">
                      {result.type}
                      {result.subtitle ? ` • ${result.subtitle}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={linkingStudyKey === key}
                    className="bg-emerald-700 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                    onClick={async () => {
                      setLinkingStudyKey(key);
                      try {
                        await linkToStudyEntity({
                          resourceId,
                          studyEntityType: result.type,
                          studyEntityId: result.id,
                        });
                        setStudyQuery("");
                      } finally {
                        setLinkingStudyKey(null);
                      }
                    }}
                  >
                    {linkingStudyKey === key ? "Linking…" : "Attach"}
                  </Button>
                </div>
              );
            })
          ) : searchResults.length ? (
            <p className="rounded-md border border-dashed border-emerald-300/80 bg-white/75 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-300">
              All matching {selectedStudyType} items are already linked.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              No {selectedStudyType} items found.
            </p>
          )}
        </div>

        <div className="space-y-2">
          {detail.studyLinks.length ? (
            detail.studyLinks.map((studyLink) => (
              <div
                key={studyLink._id}
                className="flex items-center justify-between rounded-md border border-emerald-200/80 bg-white/80 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge
                    variant="outline"
                    className="border-emerald-300 bg-emerald-100/70 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  >
                    {studyLink.studyEntityType}
                  </Badge>
                  <span className="text-sm truncate text-emerald-900 dark:text-emerald-100">
                    {displayStudyLink(studyLink)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-900/70 dark:hover:text-emerald-100"
                  onClick={() =>
                    unlinkFromStudyEntity({
                      resourceId,
                      studyEntityType: studyLink.studyEntityType,
                      studyEntityId: studyLink.studyEntityId,
                    })
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No linked study entities yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
