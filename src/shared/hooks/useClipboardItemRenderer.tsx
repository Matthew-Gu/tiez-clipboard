import { useCallback } from "react";

const EMPTY_TAG_SUGGESTIONS: string[] = [];
import type { MouseEvent, ReactNode } from "react";
import type { DragControls } from "framer-motion";
import ClipboardItem from "../../features/clipboard/components/ClipboardItem";
import type { QuickPasteHint } from "../../features/clipboard/types";
import type { ClipboardEntry } from "../types";
import type { Locale } from "../types";
import { hasSensitiveTag } from "../lib/sensitiveTags";
import { useUiStore } from "../../features/app/stores/uiStore";

interface UseClipboardItemRendererOptions {
  privacyProtection: boolean;
  isWindowPinned: boolean;
  allTags: string[];
  tagColors: Record<string, string>;
  theme: string;
  language: Locale;
  t: (key: string) => string;
  showSourceAppIcon: boolean;
  richTextSnapshotPreview: boolean;
  sensitiveMaskPrefixVisible: number;
  sensitiveMaskSuffixVisible: number;
  sensitiveMaskEmailDomain: boolean;
  quickPasteHintsById: Record<number, QuickPasteHint>;
  copyToClipboard: (
    id: number,
    content: string,
    contentType: string,
    pasteWithFormat?: boolean,
    isPinned?: boolean,
    tags?: string[]
  ) => Promise<void>;
  prefetchDetails: (ids: number[]) => void;
  openContent: (item: ClipboardEntry) => void;
  togglePin: (event: MouseEvent, id: number, isPinned: boolean) => void;
  deleteEntry: (event: MouseEvent, id: number) => void;
  handleUpdateTags: (id: number, tags: string[]) => void;
}

type RenderItemContent = (
  item: ClipboardEntry,
  index: number,
  dragControls?: DragControls,
  disableLayout?: boolean
) => ReactNode;

export const useClipboardItemRenderer = ({
  privacyProtection,
  isWindowPinned,
  allTags,
  tagColors,
  theme,
  language,
  t,
  showSourceAppIcon,
  richTextSnapshotPreview,
  sensitiveMaskPrefixVisible,
  sensitiveMaskSuffixVisible,
  sensitiveMaskEmailDomain,
  quickPasteHintsById,
  copyToClipboard,
  prefetchDetails,
  openContent,
  togglePin,
  deleteEntry,
  handleUpdateTags
}: UseClipboardItemRendererOptions): { renderItemContent: RenderItemContent } => {
  const selectedIndex = useUiStore((state) => state.selectedIndex);
  const setSelectedIndex = useUiStore((state) => state.setSelectedIndex);
  const isKeyboardMode = useUiStore((state) => state.isKeyboardMode);
  const revealedIds = useUiStore((state) => state.revealedIds);
  const setRevealedIds = useUiStore((state) => state.setRevealedIds);
  const editingTagsId = useUiStore((state) => state.editingTagsId);
  const setEditingTagsId = useUiStore((state) => state.setEditingTagsId);
  const tagInput = useUiStore((state) => state.tagInput);
  const setTagInput = useUiStore((state) => state.setTagInput);
  const renderItemContent = useCallback(
    (item: ClipboardEntry, index: number, dragControls?: DragControls, disableLayout?: boolean) => {
      const isSensitiveHidden =
        privacyProtection &&
        hasSensitiveTag(item.tags) &&
        !revealedIds.has(item.id);
      const isEditingTags = editingTagsId === item.id;

      return (
        <ClipboardItem
          id={`clipboard-item-${item.id}`}
          key={item.id}
          item={item}
          isSelected={isKeyboardMode && index === selectedIndex}
          windowPinned={isWindowPinned}
          isSensitiveHidden={!!isSensitiveHidden}
          isRevealed={revealedIds.has(item.id)}
          isEditingTags={isEditingTags}
          tagInput={isEditingTags ? tagInput : ""}
          tagSuggestions={isEditingTags ? allTags : EMPTY_TAG_SUGGESTIONS}
          tagColors={tagColors}
          theme={theme}
          language={language}
          t={t}
          showSourceAppIcon={showSourceAppIcon}
          richTextSnapshotPreview={richTextSnapshotPreview}
          sensitiveMaskPrefixVisible={sensitiveMaskPrefixVisible}
          sensitiveMaskSuffixVisible={sensitiveMaskSuffixVisible}
          sensitiveMaskEmailDomain={sensitiveMaskEmailDomain}
          quickPasteHint={quickPasteHintsById[item.id]}
          onSelect={() => setSelectedIndex(index)}
          onNeedDetail={() => prefetchDetails([item.id])}
          onCopy={(withFormat) =>
            copyToClipboard(item.id, "", item.content_type, withFormat, item.is_pinned, item.tags || [])
          }
          onToggleReveal={(e) => {
            e.stopPropagation();
            setRevealedIds((prev) => {
              const next = new Set(prev);
              if (next.has(item.id)) next.delete(item.id);
              else next.add(item.id);
              return next;
            });
          }}
          onOpen={(e) => {
            e.stopPropagation();
            openContent(item);
          }}
          onTogglePin={(e) => togglePin(e, item.id, item.is_pinned)}
          onDelete={(e) => deleteEntry(e, item.id)}
          onToggleTagEditor={(e) => {
            e.stopPropagation();
            if (editingTagsId === item.id) {
              setEditingTagsId(null);
            } else {
              setEditingTagsId(item.id);
              setTagInput("");
            }
          }}
          onTagInput={setTagInput}
          onTagAdd={() => {
            const newTag = tagInput.trim();
            if (newTag && !item.tags?.includes(newTag)) {
              handleUpdateTags(item.id, [...(item.tags || []), newTag]);
            }
            setTagInput("");
            setEditingTagsId(null);
          }}
          onTagPick={(picked) => {
            const next = picked.trim();
            if (!next || item.tags?.includes(next)) return;
            handleUpdateTags(item.id, [...(item.tags || []), next]);
            setTagInput("");
            setEditingTagsId(null);
          }}
          onTagEditCancel={() => {
            setTagInput("");
            setEditingTagsId(null);
          }}
          onTagDelete={(tag) => {
            handleUpdateTags(item.id, item.tags ? item.tags.filter((t) => t !== tag) : []);
          }}
          dragControls={dragControls}
          disableLayout={disableLayout}
        />
      );
    },
    [
      privacyProtection,
      revealedIds,
      isKeyboardMode,
      selectedIndex,
      isWindowPinned,
      editingTagsId,
      tagInput,
      allTags,
      tagColors,
      theme,
      language,
      t,
      showSourceAppIcon,
      richTextSnapshotPreview,
      sensitiveMaskPrefixVisible,
      sensitiveMaskSuffixVisible,
      sensitiveMaskEmailDomain,
      quickPasteHintsById,
      copyToClipboard,
      prefetchDetails,
      setSelectedIndex,
      setRevealedIds,
      openContent,
      togglePin,
      deleteEntry,
      setEditingTagsId,
      setTagInput,
      handleUpdateTags
    ]
  );

  return { renderItemContent };
};
