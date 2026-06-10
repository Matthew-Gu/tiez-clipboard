import type { ClipboardEntry, ClipboardEntrySummary } from "../types";

export const HISTORY_WINDOW_LIMIT = 240;
export const HISTORY_FIRST_ITEM_INDEX_BASE = 1_000_000;

export const summaryToEntry = (summary: ClipboardEntrySummary): ClipboardEntry => ({
  id: summary.id,
  content_type: summary.contentType,
  content: summary.contentHint || (summary.contentType === "image" ? "" : summary.preview),
  source_app: summary.sourceApp,
  source_app_path: summary.sourceAppPath,
  timestamp: summary.timestamp,
  preview: summary.preview,
  is_pinned: summary.isPinned,
  tags: summary.tags || [],
  use_count: summary.useCount,
  is_external: summary.isExternal,
  pinned_order: summary.pinnedOrder,
  file_preview_exists: summary.filePreviewExists,
  content_length: summary.contentLength,
  detail_loaded: false
});

export const mergeUniqueEntries = (items: ClipboardEntry[]) => {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export const capHistoryWindow = (
  items: ClipboardEntry[],
  keep: "newest" | "oldest",
  limit = HISTORY_WINDOW_LIMIT
) => {
  if (items.length <= limit) return { items, trimmed: 0 };
  const trimmed = items.length - limit;
  return {
    items: keep === "newest" ? items.slice(0, limit) : items.slice(trimmed),
    trimmed
  };
};

export const touchDetailLru = (order: number[], id: number, limit: number) => {
  const next = order.filter((value) => value !== id);
  next.push(id);
  const evicted = next.length > limit ? next.splice(0, next.length - limit) : [];
  return { order: next, evicted };
};
