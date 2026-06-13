import { memo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { ChevronRight, HelpCircle } from "lucide-react";
import type { AppState, SettingsSubpage } from "../../app/types";
import type { TwoLevelPage } from "../../app/twoLevelPage";
import GeneralSettingsGroup from "./groups/GeneralSettingsGroup";
import ClipboardSettingsGroup from "./groups/ClipboardSettingsGroup";
import AppearanceSettingsGroup from "./groups/AppearanceSettingsGroup";
import DefaultAppsSettingsGroup from "./groups/DefaultAppsSettingsGroup";
import DataSettingsGroup from "./groups/DataSettingsGroup";
import AdvancedSettingsGroup from "./groups/AdvancedSettingsGroup";
import SettingsFooter from "./SettingsFooter";
import AppSelectorModal from "./AppSelectorModal";
import { useSettingsStore } from "../../app/stores/settingsStore";
import { useUiStore } from "../../app/stores/uiStore";

interface LabelWithHintProps {
  label: string;
  hint?: string | ReactNode;
  hintKey: string;
}

interface SettingsPanelActions {
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
}

export type SettingsPanelProps = Pick<
  AppState,
  | "showAppSelector"
  | "setShowAppSelector"
  | "isRecording"
  | "setIsRecording"
  | "isRecordingSequential"
  | "setIsRecordingSequential"
  | "isRecordingSearch"
  | "setIsRecordingSearch"
> & SettingsPanelActions;

const SettingsPanel = (inputProps: SettingsPanelProps) => {
  const settings = useSettingsStore();
  const collapsedGroups = useUiStore((state) => state.collapsedGroups);
  const props = { ...inputProps, ...settings, collapsedGroups };
  const [openHints, setOpenHints] = useState<Set<string>>(new Set());
  const [privacyKindsOpen, setPrivacyKindsOpen] = useState(false);
  const [privacyRulesOpen, setPrivacyRulesOpen] = useState(false);

  const LabelWithHint: ComponentType<LabelWithHintProps> = ({ label, hint, hintKey }) => (
    <div className="settings-group__label-group">
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span className="settings-group__label">{label}</span>
        {hint && (
          <button
            type="button"
            className="settings-group__hint-button"
            title={typeof hint === "string" ? hint : undefined}
            onClick={(event) => {
              event.stopPropagation();
              setOpenHints((prev) => {
                const next = new Set(prev);
                if (next.has(hintKey)) next.delete(hintKey);
                else next.add(hintKey);
                return next;
              });
            }}
          >
            <HelpCircle size={12} />
          </button>
        )}
      </div>
      {hint && openHints.has(hintKey) && (
        typeof hint === "string" ? <span className="hint">{hint}</span> : hint
      )}
    </div>
  );

  if (props.settingsSubpage === "advanced") {
    return (
      <AdvancedSettingsGroup
        t={props.t}
        cleanupRules={props.cleanupRules}
        setCleanupRules={props.setCleanupRules}
        appCleanupPolicies={props.appCleanupPolicies}
        setAppCleanupPolicies={props.setAppCleanupPolicies}
        installedApps={props.installedApps}
        page={props.advancedSettingsPage}
        onPageChange={props.setAdvancedSettingsPage}
      />
    );
  }

  return (
    <div className="settings-page__groups">
      <GeneralSettingsGroup
        {...props}
        collapsed={props.collapsedGroups.general}
        onToggle={() => props.toggleGroup("general")}
        LabelWithHint={LabelWithHint}
      />
      <ClipboardSettingsGroup
        {...props}
        collapsed={props.collapsedGroups.clipboard}
        onToggle={() => props.toggleGroup("clipboard")}
        LabelWithHint={LabelWithHint}
        privacyKindsOpen={privacyKindsOpen}
        setPrivacyKindsOpen={setPrivacyKindsOpen}
        privacyRulesOpen={privacyRulesOpen}
        setPrivacyRulesOpen={setPrivacyRulesOpen}
      />
      <AppearanceSettingsGroup
        {...props}
        collapsed={props.collapsedGroups.appearance}
        onToggle={() => props.toggleGroup("appearance")}
        LabelWithHint={LabelWithHint}
      />
      <DefaultAppsSettingsGroup
        {...props}
        collapsed={props.collapsedGroups.default_apps}
        onToggle={() => props.toggleGroup("default_apps")}
      />
      <DataSettingsGroup
        {...props}
        collapsed={props.collapsedGroups.data}
        onToggle={() => props.toggleGroup("data")}
      />

      <div className="settings-group">
        <button
          type="button"
          className="settings-group__header settings-page__nav-card"
          onClick={props.openAdvancedSettings}
        >
          <div style={{ minWidth: 0, textAlign: "left" }}>
            <h3 style={{ margin: 0 }}>{props.t("advanced_settings")}</h3>
            <div className="settings-page__nav-note">{props.t("advanced_settings_entry_desc")}</div>
          </div>
          <ChevronRight size={16} />
        </button>
      </div>

      <SettingsFooter
        t={props.t}
        onResetSettings={props.handleResetSettings}
      />

      <AppSelectorModal
        show={props.showAppSelector}
        installedApps={props.installedApps}
        theme={props.theme}
        colorMode={props.colorMode}
        t={props.t}
        onClose={() => props.setShowAppSelector(null)}
        onSave={props.saveAppSetting}
      />
    </div>
  );
};

export default memo(SettingsPanel);
