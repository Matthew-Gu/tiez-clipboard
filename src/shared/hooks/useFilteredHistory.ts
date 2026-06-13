import { useMemo } from "react";
import type { ClipboardEntry } from "../types";

interface UseFilteredHistoryOptions {
  history: ClipboardEntry[];
  search: string;
  selectedTagFilter: string | null;
  typeFilter: string | null;
}

export const useFilteredHistory = ({
  history,
  search,
  selectedTagFilter,
  typeFilter
}: UseFilteredHistoryOptions) => {
  return useMemo(() => {
    const lowerSearch = search.toLowerCase();

    const filtered = history.filter((item) => {
      if (typeFilter && item.content_type !== typeFilter) {
        return false;
      }

      if (selectedTagFilter && !item.tags?.some((tag) => tag === selectedTagFilter)) {
        return false;
      }

      if (!lowerSearch) return true;

      return (
        item.content?.toLowerCase().includes(lowerSearch) ||
        item.source_app?.toLowerCase().includes(lowerSearch) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(lowerSearch))
      );
    });

    return filtered.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1;
      }
      if (a.is_pinned) {
        if ((a.pinned_order || 0) !== (b.pinned_order || 0)) {
          return (b.pinned_order || 0) - (a.pinned_order || 0);
        }
        return b.timestamp - a.timestamp;
      }
      return b.timestamp - a.timestamp;
    });
  }, [history, search, selectedTagFilter, typeFilter]);
};
