import { useEffect } from "react";
import type { ClipboardEntry } from "../types";

interface UseListSelectionResetOptions {
  filteredHistory: ClipboardEntry[];
  setSelectedIndex: (val: number) => void;
}

export const useListSelectionReset = ({
  filteredHistory,
  setSelectedIndex
}: UseListSelectionResetOptions) => {
  const itemIds = filteredHistory.map((item) => item.id).join(",");
  useEffect(() => {
    setSelectedIndex(0);
  }, [itemIds, setSelectedIndex]);
};

