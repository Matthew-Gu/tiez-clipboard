import type { SettingsPanelProps } from "../components/SettingsPanel";
import type { AppState, SettingsSubpage } from "../../app/types";
import type { TwoLevelPage } from "../../app/twoLevelPage";

interface UseSettingsPanelPropsOptions {
  t: (key: string) => string;
  hotkeyParts: string[];
  checkHotkeyConflict: (newHotkey: string, mode: "main" | "sequential" | "search") => boolean;
  updateHotkey: (key: string) => void;
  updateSequentialHotkey: (key: string) => void;
  updateSearchHotkey: (key: string) => void;
  saveAppSetting: (key: string, val: string) => void;
  handleResetSettings: () => void;
  toggleGroup: (group: string) => void;
  settingsSubpage: SettingsSubpage;
  advancedSettingsPage: TwoLevelPage;
  setAdvancedSettingsPage: (page: TwoLevelPage) => void;
  openAdvancedSettings: () => void;
  state: AppState;
}

export const useSettingsPanelProps = ({
  state,
  ...actions
}: UseSettingsPanelPropsOptions): SettingsPanelProps => ({
  showAppSelector: state.showAppSelector,
  setShowAppSelector: state.setShowAppSelector,
  isRecording: state.isRecording,
  setIsRecording: state.setIsRecording,
  isRecordingSequential: state.isRecordingSequential,
  setIsRecordingSequential: state.setIsRecordingSequential,
  isRecordingSearch: state.isRecordingSearch,
  setIsRecordingSearch: state.setIsRecordingSearch,
  ...actions
});
