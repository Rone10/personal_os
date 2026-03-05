"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { Link2, X } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

const resourcesApi = api.resources;

export type StudyEntityType =
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

interface ResourceTargetLinkerProps {
  scope: "project" | "study";
  projectId?: Id<"projects">;
  studyEntityType?: StudyEntityType;
  studyEntityId?: string;
  title?: string;
}

export function ResourceTargetLinker({
  scope,
  projectId,
  studyEntityType,
  studyEntityId,
  title = "Resources",
}: ResourceTargetLinkerProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<Id<"resources"> | "">("");
  const [isLinking, setIsLinking] = useState(false);

  const linkedResources = useQuery(
    scope === "project" ? resourcesApi.listForProject : resourcesApi.listForStudyEntity,
    scope === "project"
      ? projectId
        ? { projectId }
        : "skip"
      : studyEntityType && studyEntityId
        ? { studyEntityType, studyEntityId }
        : "skip",
  ) as Array<{ _id: Id<"resources">; title: string; categoryId: Id<"resourceCategories"> }> | undefined;

  const allTopics = useQuery(resourcesApi.listTopics, {}) as
    | Array<{ _id: Id<"resources">; title: string }>
    | undefined;

  const linkToProject = useMutation(resourcesApi.linkToProject);
  const unlinkFromProject = useMutation(resourcesApi.unlinkFromProject);
  const linkToStudyEntity = useMutation(resourcesApi.linkToStudyEntity);
  const unlinkFromStudyEntity = useMutation(resourcesApi.unlinkFromStudyEntity);

  const linkedIds = useMemo(
    () => new Set((linkedResources ?? []).map((topic) => topic._id)),
    [linkedResources],
  );
  const availableTopics = useMemo(
    () => (allTopics ?? []).filter((topic) => !linkedIds.has(topic._id)),
    [allTopics, linkedIds],
  );

  async function handleAttach() {
    if (!selectedTopicId) return;
    setIsLinking(true);
    try {
      if (scope === "project" && projectId) {
        await linkToProject({
          resourceId: selectedTopicId as Id<"resources">,
          projectId,
        });
      }
      if (scope === "study" && studyEntityType && studyEntityId) {
        await linkToStudyEntity({
          resourceId: selectedTopicId as Id<"resources">,
          studyEntityType,
          studyEntityId,
        });
      }
      setSelectedTopicId("");
    } finally {
      setIsLinking(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card/50 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={selectedTopicId}
          onValueChange={(value) => setSelectedTopicId(value as Id<"resources">)}
        >
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Attach existing resource topic" />
          </SelectTrigger>
          <SelectContent>
            {availableTopics.map((topic) => (
              <SelectItem key={topic._id} value={topic._id}>
                {topic.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={handleAttach}
          disabled={!selectedTopicId || isLinking}
        >
          Attach
        </Button>
      </div>

      <div className="space-y-2">
        {linkedResources?.length ? (
          linkedResources.map((topic) => (
            <div
              key={topic._id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <Link href={`/resources/${topic._id}`} className="text-sm hover:underline">
                {topic.title}
              </Link>
              <div className="flex items-center gap-2">
                <Badge variant="outline">topic</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    if (scope === "project" && projectId) {
                      unlinkFromProject({
                        resourceId: topic._id,
                        projectId: projectId as Id<"projects">,
                      });
                    }
                    if (scope === "study" && studyEntityType && studyEntityId) {
                      unlinkFromStudyEntity({
                        resourceId: topic._id,
                        studyEntityType,
                        studyEntityId,
                      });
                    }
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No linked resource topics.</p>
        )}
      </div>
    </section>
  );
}
