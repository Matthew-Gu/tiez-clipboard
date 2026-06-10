import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Dispatch, SetStateAction } from "react";
import type {
  ClipboardEntry,
  ClipboardEntryDetail,
  ClipboardEntrySummary,
  ClipboardHistoryPage
} from "../types";
import {
  capHistoryWindow,
  HISTORY_FIRST_ITEM_INDEX_BASE,
  mergeUniqueEntries,
  summaryToEntry,
  touchDetailLru
} from "../lib/historyWindow";

const DETAIL_LIMIT = 48;

interface UseHistoryFetchOptions {
  debouncedSearch: string;
  typeFilter: string | null;
  persistentLimitEnabled: boolean;
  persistentLimit: number;
  pageSize: number;
  currentOffset: number;
  historyLength: number;
  history: ClipboardEntry[];
  setHistory: Dispatch<SetStateAction<ClipboardEntry[]>>;
  setCurrentOffset: Dispatch<SetStateAction<number>>;
  setHasMore: Dispatch<SetStateAction<boolean>>;
  isLoadingMore: boolean;
  hasMore: boolean;
  setIsLoadingMore: Dispatch<SetStateAction<boolean>>;
}

export const useHistoryFetch = ({
  debouncedSearch,
  typeFilter,
  pageSize,
  history,
  setHistory,
  setCurrentOffset,
  setHasMore,
  isLoadingMore,
  setIsLoadingMore
}: UseHistoryFetchOptions) => {
  const loadingOlderRef = useRef(false);
  const loadingNewerRef = useRef(false);
  const fetchSeqRef = useRef(0);
  const historyRef = useRef(history);
  const visibleRangeRef = useRef({ startIndex: 0, endIndex: 12 });
  const [hasNewer, setHasNewer] = useState(false);
  const [firstItemIndex, setFirstItemIndex] = useState(HISTORY_FIRST_ITEM_INDEX_BASE);
  const [detailCache, setDetailCache] = useState<Record<number, ClipboardEntryDetail>>({});
  const detailCacheRef = useRef<Record<number, ClipboardEntryDetail>>({});
  const detailLruRef = useRef<number[]>([]);
  const detailLoadingRef = useRef(new Set<number>());

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    detailCacheRef.current = detailCache;
  }, [detailCache]);

  const invalidateDetail = useCallback((id: number) => {
    detailLoadingRef.current.delete(id);
    detailLruRef.current = detailLruRef.current.filter((value) => value !== id);
    setDetailCache((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const prefetchDetails = useCallback(async (ids: number[]) => {
    const uniqueIds = Array.from(new Set(ids)).filter(
      (id) => id !== 0 && !detailLoadingRef.current.has(id) && !detailCacheRef.current[id]
    );
    if (uniqueIds.length === 0) return;
    uniqueIds.forEach((id) => detailLoadingRef.current.add(id));

    const loaded = await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          return await invoke<ClipboardEntryDetail>("get_clipboard_entry_detail", { id });
        } catch (error) {
          console.error("Failed to load clipboard detail", id, error);
          return null;
        } finally {
          detailLoadingRef.current.delete(id);
        }
      })
    );

    const details = loaded.filter((item): item is ClipboardEntryDetail => !!item);
    if (details.length === 0) return;
    setDetailCache((prev) => {
      const next = { ...prev };
      for (const detail of details) {
        next[detail.id] = detail;
        const touched = touchDetailLru(detailLruRef.current, detail.id, DETAIL_LIMIT);
        detailLruRef.current = touched.order;
        touched.evicted.forEach((id) => delete next[id]);
      }
      return next;
    });
  }, []);

  const hydratedHistory = useMemo(
    () =>
      history.map((item) => {
        const detail = detailCache[item.id];
        if (!detail) return item;
        return {
          ...item,
          content_type: detail.contentType,
          content: detail.content,
          html_content: detail.htmlContent,
          detail_loaded: true
        };
      }),
    [detailCache, history]
  );

  const prefetchVisibleRange = useCallback(
    (startIndex: number, endIndex: number) => {
      visibleRangeRef.current = { startIndex, endIndex };
      const unpinned = historyRef.current.filter((item) => !item.is_pinned);
      const from = Math.max(0, startIndex - 4);
      const to = Math.min(unpinned.length, endIndex + 5);
      const visibleIds = unpinned.slice(from, to).map((item) => item.id);
      const pinnedIds = historyRef.current.filter((item) => item.is_pinned).slice(0, 10).map((item) => item.id);
      void prefetchDetails([...pinnedIds, ...visibleIds]);
    },
    [prefetchDetails]
  );

  const requestPage = useCallback(
    async (
      direction: "older" | "newer",
      cursor: ClipboardEntry | undefined,
      includePinned: boolean
    ) =>
      invoke<ClipboardHistoryPage>("get_clipboard_history_page", {
        limit: pageSize,
        direction,
        cursorTimestamp: cursor?.timestamp,
        cursorId: cursor?.id,
        contentType: typeFilter || undefined,
        includePinned
      }),
    [pageSize, typeFilter]
  );

  const fetchHistory = useCallback(
    async (reset = false) => {
      const seq = ++fetchSeqRef.current;
      const hasSearch = !!debouncedSearch?.trim();
      try {
        if (hasSearch) {
          let term = debouncedSearch.trim();
          let tagOnly = false;
          if (term.startsWith("tag:")) {
            term = term.slice(4);
            tagOnly = true;
          }
          const summaries = await invoke<ClipboardEntrySummary[]>(
            "search_clipboard_history_summaries",
            { searchTerm: term, limit: 200, tagOnly }
          );
          if (seq !== fetchSeqRef.current) return;
          const entries = summaries.map(summaryToEntry);
          setHistory(entries);
          setHasMore(false);
          setHasNewer(false);
          setCurrentOffset(entries.length);
          setFirstItemIndex(HISTORY_FIRST_ITEM_INDEX_BASE);
          prefetchVisibleRange(0, Math.min(12, entries.length - 1));
          return;
        }

        if (!reset && historyRef.current.length > 0) return;
        const page = await requestPage("older", undefined, true);
        if (seq !== fetchSeqRef.current) return;
        const entries = [...page.pinned, ...page.items].map(summaryToEntry);
        setHistory(mergeUniqueEntries(entries));
        setHasMore(page.hasOlder);
        setHasNewer(page.hasNewer);
        setCurrentOffset(page.items.length);
        setFirstItemIndex(HISTORY_FIRST_ITEM_INDEX_BASE);
        prefetchVisibleRange(0, Math.min(12, page.items.length - 1));
      } catch (error) {
        console.error("无法获取历史记录", error);
        setHasMore(false);
      }
    },
    [
      debouncedSearch,
      prefetchVisibleRange,
      requestPage,
      setCurrentOffset,
      setHasMore,
      setHistory
    ]
  );

  const loadMoreHistory = useCallback(async () => {
    if (loadingOlderRef.current || isLoadingMore || !historyRef.current.length) return;
    if (debouncedSearch?.trim()) return;
    const unpinned = historyRef.current.filter((item) => !item.is_pinned);
    const cursor = unpinned[unpinned.length - 1];
    if (!cursor) return;

    loadingOlderRef.current = true;
    setIsLoadingMore(true);
    try {
      const page = await requestPage("older", cursor, false);
      const incoming = page.items.map(summaryToEntry);
      let trimmed = 0;
      setHistory((prev) => {
        const pinned = prev.filter((item) => item.is_pinned);
        const capped = capHistoryWindow(
          mergeUniqueEntries([...prev.filter((item) => !item.is_pinned), ...incoming]),
          "oldest"
        );
        const next = capped.items;
        trimmed = capped.trimmed;
        return [...pinned, ...next];
      });
      if (trimmed > 0) {
        setFirstItemIndex((prev) => prev + trimmed);
        setHasNewer(true);
      }
      setHasMore(page.hasOlder);
    } finally {
      loadingOlderRef.current = false;
      setIsLoadingMore(false);
    }
  }, [debouncedSearch, isLoadingMore, requestPage, setHasMore, setHistory, setIsLoadingMore]);

  const loadNewerHistory = useCallback(async () => {
    if (loadingNewerRef.current || !hasNewer || debouncedSearch?.trim()) return;
    const unpinned = historyRef.current.filter((item) => !item.is_pinned);
    const cursor = unpinned[0];
    if (!cursor) return;

    loadingNewerRef.current = true;
    try {
      const page = await requestPage("newer", cursor, false);
      const incoming = page.items.map(summaryToEntry);
      let added = 0;
      let trimmed = 0;
      setHistory((prev) => {
        const pinned = prev.filter((item) => item.is_pinned);
        const current = prev.filter((item) => !item.is_pinned);
        const currentIds = new Set(current.map((item) => item.id));
        const fresh = incoming.filter((item) => !currentIds.has(item.id));
        added = fresh.length;
        const capped = capHistoryWindow([...fresh, ...current], "newest");
        const next = capped.items;
        trimmed = capped.trimmed;
        return [...pinned, ...next];
      });
      if (added > 0) setFirstItemIndex((prev) => Math.max(1, prev - added));
      if (trimmed > 0) setHasMore(true);
      setHasNewer(page.hasNewer);
    } finally {
      loadingNewerRef.current = false;
    }
  }, [debouncedSearch, hasNewer, requestPage, setHasMore, setHistory]);

  const handleSummaryUpdated = useCallback(
    (summary: ClipboardEntrySummary) => {
      invalidateDetail(summary.id);
      const entry = summaryToEntry(summary);
      const atTop = visibleRangeRef.current.startIndex <= 2;
      const existed = historyRef.current.some((item) => item.id === entry.id);
      if (!existed && !entry.is_pinned && atTop) {
        setFirstItemIndex((prev) => Math.max(1, prev - 1));
      }
      setHistory((prev) => {
        const existing = prev.some((item) => item.id === entry.id);
        if (!existing && !entry.is_pinned && !atTop) {
          setHasNewer(true);
          return prev;
        }
        const without = prev.filter((item) => item.id !== entry.id);
        const pinned = without.filter((item) => item.is_pinned);
        let unpinned = without.filter((item) => !item.is_pinned);
        if (entry.is_pinned) pinned.push(entry);
        else unpinned.unshift(entry);
        pinned.sort((a, b) => (b.pinned_order || 0) - (a.pinned_order || 0));
        unpinned = capHistoryWindow(unpinned, "newest").items;
        return [...pinned, ...unpinned];
      });
    },
    [invalidateDetail, setHistory]
  );

  const handleRemoved = useCallback(
    (id: number) => {
      invalidateDetail(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    },
    [invalidateDetail, setHistory]
  );

  return {
    fetchHistory,
    loadMoreHistory,
    loadNewerHistory,
    hydratedHistory,
    firstItemIndex,
    hasNewer,
    prefetchVisibleRange,
    prefetchDetails,
    invalidateDetail,
    handleSummaryUpdated,
    handleRemoved
  };
};
