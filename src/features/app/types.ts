import type { Dispatch, SetStateAction } from "react";
import type { ClipboardEntry } from "../../shared/types";

export type StateSetter<T> = Dispatch<SetStateAction<T>>;

export type InstalledAppOption = { label: string; value: string };
export type DefaultAppsMap = Record<string, string>;
export type QuickPasteModifier = "disabled" | "ctrl" | "alt" | "shift" | "win";
export type SettingsSubpage = "home" | "advanced";

export interface AppState {
  collapsedGroups: Record<string, boolean>;
  setCollapsedGroups: StateSetter<Record<string, boolean>>;
  history: ClipboardEntry[];
  setHistory: StateSetter<ClipboardEntry[]>;
  tagInput: string;
  setTagInput: StateSetter<string>;
  editingTagsId: number | null;
  setEditingTagsId: StateSetter<number | null>;
  revealedIds: Set<number>;
  setRevealedIds: StateSetter<Set<number>>;
  showAppSelector: string | null;
  setShowAppSelector: StateSetter<string | null>;
  isRecording: boolean;
  setIsRecording: StateSetter<boolean>;
  isRecordingSequential: boolean;
  setIsRecordingSequential: StateSetter<boolean>;
  isRecordingRich: boolean;
  setIsRecordingRich: StateSetter<boolean>;
  isRecordingSearch: boolean;
  setIsRecordingSearch: StateSetter<boolean>;
  winClipboardDisabled: boolean;
  setWinClipboardDisabled: StateSetter<boolean>;
  showHotkeyHint: boolean;
  setShowHotkeyHint: StateSetter<boolean>;
  selectedIndex: number;
  setSelectedIndex: StateSetter<number>;
  isKeyboardMode: boolean;
  setIsKeyboardMode: StateSetter<boolean>;
  isLoadingMore: boolean;
  setIsLoadingMore: StateSetter<boolean>;
  hasMore: boolean;
  setHasMore: StateSetter<boolean>;
  currentOffset: number;
  setCurrentOffset: StateSetter<number>;
}
