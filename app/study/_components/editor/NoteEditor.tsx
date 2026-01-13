"use client";

import { useState, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Link2, Keyboard } from "lucide-react";
import LinkPicker, { SelectedReference, ReferenceType } from "./LinkPicker";

export interface InlineReference {
  targetType: ReferenceType;
  targetId: string;
  startOffset: number;
  endOffset: number;
  displayText: string;
}

interface NoteEditorProps {
  content: string;
  references: InlineReference[];
  onContentChange: (content: string) => void;
  onReferencesChange: (refs: InlineReference[]) => void;
  placeholder?: string;
  className?: string;
}

export default function NoteEditor({
  content,
  references,
  onContentChange,
  onReferencesChange,
  placeholder = "Write your note here... Press Ctrl+K to insert a reference.",
  className,
}: NoteEditorProps) {
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        setCursorPosition(textarea.selectionStart);
      }
      setShowLinkPicker(true);
    }
  }, []);

  // Handle reference insertion
  const handleReferenceSelect = useCallback((ref: SelectedReference) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const before = content.slice(0, cursorPosition);
    const after = content.slice(cursorPosition);
    const insertText = ref.displayText;

    // Add a space after the reference if there isn't one already
    const needsSpace = after.length === 0 || (after[0] !== ' ' && after[0] !== '\n');
    const spacer = needsSpace ? ' ' : '';

    // Create new content with the reference inserted (plus trailing space)
    const newContent = before + insertText + spacer + after;
    onContentChange(newContent);

    // Create new reference (without the space in the reference span)
    const newRef: InlineReference = {
      targetType: ref.type,
      targetId: ref.id,
      startOffset: cursorPosition,
      endOffset: cursorPosition + insertText.length,
      displayText: ref.displayText,
    };

    // Total insertion length includes the spacer
    const totalInsertLength = insertText.length + spacer.length;

    // Adjust existing references that come after the insertion point
    const adjustedRefs = references.map(existingRef => {
      if (existingRef.startOffset >= cursorPosition) {
        return {
          ...existingRef,
          startOffset: existingRef.startOffset + totalInsertLength,
          endOffset: existingRef.endOffset + totalInsertLength,
        };
      }
      return existingRef;
    });

    onReferencesChange([...adjustedRefs, newRef]);

    // Reset cursor position after insert (after the space)
    setTimeout(() => {
      if (textarea) {
        const newPos = cursorPosition + totalInsertLength;
        textarea.focus();
        textarea.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [content, cursorPosition, references, onContentChange, onReferencesChange]);

  // Handle content changes and update reference offsets
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const oldContent = content;

    // Simple approach: just update content and let the user manage references
    // A more sophisticated approach would track individual character changes
    // and adjust reference offsets accordingly

    onContentChange(newContent);

    // If content length changed significantly, references may be invalid
    // For now, we'll keep them but a more robust solution would validate
    const lengthDiff = newContent.length - oldContent.length;

    if (lengthDiff !== 0) {
      // Find where the change occurred
      const changePos = findChangePosition(oldContent, newContent);

      // Adjust references
      const adjustedRefs = references
        .map(ref => {
          // If reference is entirely before the change, keep as is
          if (ref.endOffset <= changePos) {
            return ref;
          }
          // If reference is entirely after the change, adjust offsets
          if (ref.startOffset >= changePos) {
            return {
              ...ref,
              startOffset: ref.startOffset + lengthDiff,
              endOffset: ref.endOffset + lengthDiff,
            };
          }
          // If reference overlaps with change, it may be corrupted
          // For now, keep it but mark for potential removal
          return ref;
        })
        .filter(ref => ref.startOffset >= 0 && ref.endOffset <= newContent.length);

      if (JSON.stringify(adjustedRefs) !== JSON.stringify(references)) {
        onReferencesChange(adjustedRefs);
      }
    }
  }, [content, references, onContentChange, onReferencesChange]);

  return (
    <div className={className}>
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[200px] pr-12"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={() => {
            const textarea = textareaRef.current;
            if (textarea) {
              setCursorPosition(textarea.selectionStart);
            }
            setShowLinkPicker(true);
          }}
          title="Insert reference (Ctrl+K)"
        >
          <Link2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <Keyboard className="h-3 w-3" />
          <span>Ctrl+K to insert reference</span>
        </div>
        {references.length > 0 && (
          <span>{references.length} reference{references.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      <LinkPicker
        open={showLinkPicker}
        onClose={() => setShowLinkPicker(false)}
        onSelect={handleReferenceSelect}
      />
    </div>
  );
}

/**
 * Find the position where the text changed.
 * Simple implementation that finds the first differing character.
 */
function findChangePosition(oldText: string, newText: string): number {
  const minLen = Math.min(oldText.length, newText.length);
  for (let i = 0; i < minLen; i++) {
    if (oldText[i] !== newText[i]) {
      return i;
    }
  }
  return minLen;
}
