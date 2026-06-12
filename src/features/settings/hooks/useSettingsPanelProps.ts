import type { SettingsPanelProps } from "../components/SettingsPanel";
import type { AppState, SettingsSubpage } from "../../app/types";

interface UseSettingsPanelPropsOptions {
  t: (key: string) => string;
  hotkeyParts: string[];
  checkHotkeyConflict: (newHotkey: string, mode: "main" | "sequential" | "rich" | "search") => boolean;
  updateHotkey: (key: string) => void;
  updateSequentialHotkey: (key: string) => void;
  updateRichPasteHotkey: (key: string) => void;
  updateSearchHotkey: (key: string) => void;
  saveAppSetting: (key: string, val: string) => void;
  handleResetSettings: () => void;
  toggleGroup: (group: string) => void;
  settingsSubpage: SettingsSubpage;
  openAdvancedSettings: () => void;
  state: AppState;
}

export const useSettingsPanelProps = ({
  state,
  ...actions
}: UseSettingsPanelPropsOptions): SettingsPanelProps => ({
  collapsedGroups: state.collapsedGroups,
  showAppSelector: state.showAppSelector,
  setShowAppSelector: state.setShowAppSelector,
  isRecording: state.isRecording,
  setIsRecording: state.setIsRecording,
  isRecordingSequential: state.isRecordingSequential,
  setIsRecordingSequential: state.setIsRecordingSequential,
  isRecordingRich: state.isRecordingRich,
  setIsRecordingRich: state.setIsRecordingRich,
  isRecordingSearch: state.isRecordingSearch,
  setIsRecordingSearch: state.setIsRecordingSearch,
  ...actions
});
