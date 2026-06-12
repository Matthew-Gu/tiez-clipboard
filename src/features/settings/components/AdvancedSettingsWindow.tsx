import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { translations } from "../../../locales";
import AdvancedSettingsGroup from "./groups/AdvancedSettingsGroup";
import { useSettingsStore } from "../../app/stores/settingsStore";
import { useSettingsInit } from "../../../shared/hooks/useSettingsInit";
import type { TwoLevelPage } from "../../app/twoLevelPage";

const AdvancedSettingsWindow = () => {
  useSettingsInit();
  const [page, setPage] = useState<TwoLevelPage>("list");
  const {
    language,
    cleanupRules,
    setCleanupRules,
    appCleanupPolicies,
    setAppCleanupPolicies,
    installedApps,
    setInstalledApps
  } = useSettingsStore();

  const t = useCallback((key: string) => {
    const translationKey = key as keyof typeof translations.zh;
    return translations[language][translationKey] || translations.en[translationKey] || key;
  }, [language]);

  useEffect(() => {
    invoke<{ name: string; path: string }[]>("scan_installed_apps")
      .then((apps) => setInstalledApps(
        apps.map((app) => ({ label: app.name, value: app.path }))
          .sort((a, b) => a.label.localeCompare(b.label))
      ))
      .catch(console.error);
  }, [setInstalledApps]);

  return (
    <div className="advanced-settings-window-shell">
      <AdvancedSettingsGroup
        t={t}
        cleanupRules={cleanupRules}
        setCleanupRules={setCleanupRules}
        appCleanupPolicies={appCleanupPolicies}
        setAppCleanupPolicies={setAppCleanupPolicies}
        installedApps={installedApps}
        page={page}
        onPageChange={setPage}
        showInlineBack
      />
    </div>
  );
};

export default AdvancedSettingsWindow;
