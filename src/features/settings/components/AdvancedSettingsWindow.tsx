import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { translations } from "../../../locales";
import AdvancedSettingsGroup from "./groups/AdvancedSettingsGroup";
import type { InstalledAppOption } from "../../app/types";
import type { AppCleanupPolicy } from "../types";

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
    invoke<Record<string, string>>("get_settings")
      .then((settings) => {
        setLanguage(settings["app.language"] === "en" || settings["app.language"] === "tw"
          ? settings["app.language"]
          : "zh");
        setCleanupRules(settings["app.cleanup_rules"] || "");
        try {
          setAppCleanupPolicies(JSON.parse(settings["app.app_cleanup_policies"] || "[]"));
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
