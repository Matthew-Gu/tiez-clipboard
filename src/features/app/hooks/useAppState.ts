import { useState } from "react";
import type { ClipboardEntry } from "../../../shared/types";
import type { AppState } from "../types";

export const useAppState = (): AppState => {
  const [history, setHistory] = useState<ClipboardEntry[]>([]);
  const [showAppSelector, setShowAppSelector] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingSequential, setIsRecordingSequential] = useState(false);
  const [isRecordingSearch, setIsRecordingSearch] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);

  return {
    history,
    setHistory,
    showAppSelector,
    setShowAppSelector,
    isRecording,
    setIsRecording,
    isRecordingSequential,
    setIsRecordingSequential,
    isRecordingSearch,
    setIsRecordingSearch,
    isLoadingMore,
    setIsLoadingMore,
    hasMore,
    setHasMore,
    currentOffset,
    setCurrentOffset
  };
};
