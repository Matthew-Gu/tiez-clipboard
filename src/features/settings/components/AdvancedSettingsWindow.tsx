import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { translations } from "../../../locales";
import AdvancedSettingsGroup from "./groups/AdvancedSettingsGroup";
import type { InstalledAppOption } from "../../app/types";
import type { AppCleanupPolicy } from "../types";
import { getSettings } from "../../../shared/ipc/commands";
import { APP_SETTING_KEYS } from "../../../shared/ipc/contracts";

const AdvancedSettingsWindow = () => {
  const [language, setLanguage] = useState<"zh" | "en" | "tw">("zh");
  const [cleanupRules, setCleanupRules] = useState("");
  const [appCleanupPolicies, setAppCleanupPolicies] = useState<AppCleanupPolicy[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledAppOption[]>([]);

  const t = useCallback((key: string) => {
    const translationKey = key as keyof typeof translations.zh;
    return translations[language][translationKey] || translations.en[translationKey] || key;
  }, [language]);

  useEffect(() => {
    getSettings()
      .then((settings) => {
        const savedLanguage = settings[APP_SETTING_KEYS.language];
        setLanguage(savedLanguage === "en" || savedLanguage === "tw"
          ? savedLanguage
          : "zh");
        setCleanupRules(settings[APP_SETTING_KEYS.cleanupRules] || "");
        try {
          setAppCleanupPolicies(JSON.parse(settings[APP_SETTING_KEYS.appCleanupPolicies] || "[]"));
        } catch {
          setAppCleanupPolicies([]);
        }
      })
      .catch(console.error);

    invoke<{ name: string; path: string }[]>("scan_installed_apps")
      .then((apps) => setInstalledApps(
        apps.map((app) => ({ label: app.name, value: app.path }))
          .sort((a, b) => a.label.localeCompare(b.label))
      ))
      .catch(console.error);
  }, []);

  return (
    <div className="advanced-settings-window-shell">
      <AdvancedSettingsGroup
        t={t}
        cleanupRules={cleanupRules}
        setCleanupRules={setCleanupRules}
        appCleanupPolicies={appCleanupPolicies}
        setAppCleanupPolicies={setAppCleanupPolicies}
        installedApps={installedApps}
      />
    </div>
  );
};

export default AdvancedSettingsWindow;
