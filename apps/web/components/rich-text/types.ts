import type { JSONContent } from "@tiptap/react";

export type { JSONContent };

/**
 * Entity types that can be referenced in the rich text editor
 */
export type EntityReferenceType =
  | "word"
  | "verse"
  | "hadith"
  | "root"
  | "lesson"
  | "chapter"
  | "tag"
  | "course"
  | "book"
  | "note";

/**
 * Attributes stored in an entity reference mark
 */
export interface EntityReferenceAttributes {
  targetType: EntityReferenceType;
  targetId: string;
  displayText: string;
}

/**
 * Extracted reference for storage in database (for backlinks)
 */
export interface ExtractedReference {
  targetType: EntityReferenceType;
  targetId: string;
  displayText: string;
}

/**
 * Props for the RichTextEditor component
 */
export interface RichTextEditorProps {
  /** The current content as Tiptap JSON */
  value?: JSONContent;
  /** Callback when content changes */
  onChange?: (content: JSONContent) => void;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether entity references are enabled (shows Ctrl+K) */
  enableEntityReferences?: boolean;
  /** Current note ID to prevent self-referencing */
  currentNoteId?: string;
  /** Minimum height of the editor */
  minHeight?: string;
  /** Whether the editor is read-only */
  editable?: boolean;
}

/**
 * Props for the RichTextViewer component
 */
export interface RichTextViewerProps {
  /** The content to display as Tiptap JSON */
  content: JSONContent;
  /** Additional CSS classes */
  className?: string;
  /** Callback when an entity reference is clicked */
  onEntityClick?: (ref: EntityReferenceAttributes) => void;
}

/**
 * Extract all entity references from Tiptap JSON content
 */
export function extractReferences(content: JSONContent): ExtractedReference[] {
  const references: ExtractedReference[] = [];
  const seen = new Set<string>();

  function traverse(node: JSONContent) {
    // Check marks on this node
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === "entityReference" && mark.attrs) {
          const key = `${mark.attrs.targetType}:${mark.attrs.targetId}`;
          if (!seen.has(key)) {
            seen.add(key);
            references.push({
              targetType: mark.attrs.targetType as EntityReferenceType,
              targetId: mark.attrs.targetId as string,
              displayText: mark.attrs.displayText as string,
            });
          }
        }
      }
    }

    // Traverse children
    if (node.content) {
      for (const child of node.content) {
        traverse(child);
      }
    }
  }

  traverse(content);
  return references;
}
