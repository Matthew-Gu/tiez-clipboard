import type { Dispatch, SetStateAction } from "react";
import type { ClipboardEntry } from "../../shared/types";

export type StateSetter<T> = Dispatch<SetStateAction<T>>;

export type InstalledAppOption = { label: string; value: string };
export type DefaultAppsMap = Record<string, string>;
export type QuickPasteModifier = "disabled" | "ctrl" | "alt" | "shift" | "win";
export type SettingsSubpage = "home" | "advanced";

export interface AppState {
  history: ClipboardEntry[];
  setHistory: StateSetter<ClipboardEntry[]>;
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
  isLoadingMore: boolean;
  setIsLoadingMore: StateSetter<boolean>;
  hasMore: boolean;
  setHasMore: StateSetter<boolean>;
  currentOffset: number;
  setCurrentOffset: StateSetter<number>;
}
