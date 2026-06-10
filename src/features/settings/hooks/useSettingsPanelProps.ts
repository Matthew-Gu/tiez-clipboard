import type { SettingsPanelProps } from "../components/SettingsPanel";
import type { AppState } from "../../app/types";

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
  state: AppState;
}

export const useSettingsPanelProps = ({
  state,
  ...actions
}: UseSettingsPanelPropsOptions): SettingsPanelProps => ({
  ...state,
  ...actions
});
