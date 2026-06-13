import { useEffect } from "react";

interface UseSearchFetchTriggerOptions {
  debouncedSearch: string;
  isComposing: boolean;
  selectedTagFilter?: string | null;
  typeFilter?: string | null;
  fetchHistory: (reset?: boolean) => void;
}

export const useSearchFetchTrigger = ({
  debouncedSearch,
  isComposing,
  selectedTagFilter,
  typeFilter,
  fetchHistory
}: UseSearchFetchTriggerOptions) => {
  useEffect(() => {
    if (!isComposing) {
      fetchHistory(true);
    }
  }, [debouncedSearch, isComposing, fetchHistory]);

  useEffect(() => {
    fetchHistory(true);
  }, [selectedTagFilter, typeFilter, fetchHistory]);
};
