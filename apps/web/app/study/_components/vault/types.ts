export type VaultEntryType = "word" | "phrase";

export interface VaultSubject {
  _id: string;
  name: string;
  slug: string;
  order: number;
}

export interface VaultCategory {
  _id: string;
  subjectId: string;
  name: string;
  slug: string;
  order: number;
}

export interface VaultTopic {
  _id: string;
  subjectId: string;
  categoryId: string;
  name: string;
  slug: string;
  order: number;
}

export interface VaultTag {
  _id: string;
  name: string;
  color?: string;
}

export interface VaultEntryRow {
  _id: string;
  entryType: VaultEntryType;
  text: string;
  transliteration?: string;
  subjectId: string;
  categoryId: string;
  topicId: string;
  bookId?: string;
  chapterId?: string;
  sourcePage?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  subject?: VaultSubject | null;
  category?: VaultCategory | null;
  topic?: VaultTopic | null;
  book?: { _id: string; title: string } | null;
  chapter?: { _id: string; title: string } | null;
  tags?: VaultTag[];
  referencesCount?: number;
}

export interface VaultReference {
  _id: string;
  entryId: string;
  referenceType: "internal" | "external";
  targetType?:
    | "word"
    | "verse"
    | "hadith"
    | "lesson"
    | "chapter"
    | "root"
    | "tag"
    | "course"
    | "book"
    | "note"
    | "collection"
    | "topic"
    | "vaultEntry";
  targetId?: string;
  url?: string;
  label: string;
  note?: string;
  order: number;
  target?: Record<string, unknown> | null;
}

