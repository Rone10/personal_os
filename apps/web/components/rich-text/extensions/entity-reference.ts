import { Mark, mergeAttributes } from "@tiptap/react";

export interface EntityReferenceOptions {
  HTMLAttributes: Record<string, unknown>;
  onOpenPicker: () => void;
}

/**
 * Entity Reference Mark Extension
 *
 * Allows linking to internal entities like words, verses, hadiths, etc.
 * Renders as a styled span with data attributes for the target entity.
 *
 * Usage: editor.chain().focus().setMark("entityReference", { targetType, targetId, displayText }).run()
 */
export const EntityReference = Mark.create<EntityReferenceOptions>({
  name: "entityReference",

  addOptions() {
    return {
      HTMLAttributes: {},
      onOpenPicker: () => {},
    };
  },

  addAttributes() {
    return {
      targetType: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-target-type"),
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-target-type": attributes.targetType,
        }),
      },
      targetId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-target-id"),
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-target-id": attributes.targetId,
        }),
      },
      displayText: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-display-text"),
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-display-text": attributes.displayText,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-entity-reference]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-entity-reference": "",
        class: "entity-reference",
      }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      "Mod-k": () => {
        this.options.onOpenPicker();
        return true;
      },
    };
  },
});

export default EntityReference;
