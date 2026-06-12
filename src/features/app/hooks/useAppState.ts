import { useState } from "react";
import type { ClipboardEntry } from "../../../shared/types";
import type { AppState } from "../types";

export const useAppState = (): AppState => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    general: true,
    clipboard: true,
    advanced: true,
    appearance: true,
    default_apps: true,
    data: true
  });
  const [history, setHistory] = useState<ClipboardEntry[]>([]);
  const [search, setSearch] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [searchIsFocused, setSearchIsFocused] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [editingTagsId, setEditingTagsId] = useState<number | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());
  const [showAppSelector, setShowAppSelector] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingSequential, setIsRecordingSequential] = useState(false);
  const [isRecordingRich, setIsRecordingRich] = useState(false);
  const [isRecordingSearch, setIsRecordingSearch] = useState(false);
  const [winClipboardDisabled, setWinClipboardDisabled] = useState(false);
  const [showHotkeyHint, setShowHotkeyHint] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  return {
    collapsedGroups,
    setCollapsedGroups,
    history,
    setHistory,
    search,
    setSearch,
    isComposing,
    setIsComposing,
    searchIsFocused,
    setSearchIsFocused,
    showTagFilter,
    setShowTagFilter,
    tagInput,
    setTagInput,
    editingTagsId,
    setEditingTagsId,
    revealedIds,
    setRevealedIds,
    showAppSelector,
    setShowAppSelector,
    isRecording,
    setIsRecording,
    isRecordingSequential,
    setIsRecordingSequential,
    isRecordingRich,
    setIsRecordingRich,
    isRecordingSearch,
    setIsRecordingSearch,
    winClipboardDisabled,
    setWinClipboardDisabled,
    showHotkeyHint,
    setShowHotkeyHint,
    selectedIndex,
    setSelectedIndex,
    isKeyboardMode,
    setIsKeyboardMode,
    isLoadingMore,
    setIsLoadingMore,
    hasMore,
    setHasMore,
    currentOffset,
    setCurrentOffset,
    typeFilter,
    setTypeFilter
  };
};
