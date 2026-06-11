import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { DEFAULT_THEME, normalizeThemeId } from "../config/themes";
import type { Locale } from "../types";
import { isTauriRuntime } from "../lib/tauriRuntime";
import { getSettings } from "../ipc/commands";
import { APP_SETTING_KEYS, TAURI_EVENTS } from "../ipc/contracts";

interface UseSettingsInitOptions {
  setAppSettings: (settings: Record<string, string>) => void;
  setHotkey: (val: string) => void;
  setTheme: (val: string) => void;
  setColorMode: (val: string) => void;
  setLanguage: (val: Locale) => void;
}

export const useSettingsInit = ({
  setAppSettings,
  setHotkey,
  setTheme,
  setColorMode,
  setLanguage
}: UseSettingsInitOptions) => {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const settingsEffectCount = useRef(0);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    let disposed = false;

    const loadSettings = () => {
      settingsEffectCount.current++;
      console.log(`[THEME DEBUG] Settings useEffect run #${settingsEffectCount.current}`);

      getSettings()
        .then((result) => {
          if (disposed) return;

          console.log(
            `[THEME DEBUG] get_settings response (run #${settingsEffectCount.current}):`,
            result
          );
          console.log("[THEME DEBUG] app.color_mode from DB:", result[APP_SETTING_KEYS.colorMode]);

          setAppSettings(result);
          if (result[APP_SETTING_KEYS.hotkey]) setHotkey(result[APP_SETTING_KEYS.hotkey]);

          const loadedTheme = normalizeThemeId(result[APP_SETTING_KEYS.theme] || DEFAULT_THEME);
          const loadedColorMode = result[APP_SETTING_KEYS.colorMode] || "system";
          console.log("[THEME DEBUG] loadedColorMode:", loadedColorMode);

          setTheme(loadedTheme);
          setColorMode(loadedColorMode);
          try {
            localStorage.setItem("tiez_theme", loadedTheme);
            localStorage.setItem("tiez_color_mode", loadedColorMode);
          } catch {
            // Ignore localStorage errors
          }

          if (result[APP_SETTING_KEYS.language]) {
            setLanguage(result[APP_SETTING_KEYS.language] as Locale);
          }

          setSettings(result);
        })
        .catch(console.error);
    };

    loadSettings();

    const unlisten = listen(TAURI_EVENTS.settingsChanged, () => {
      loadSettings();
    });

    return () => {
      disposed = true;
      unlisten.then((off) => off());
    };
  }, [setAppSettings, setHotkey, setTheme, setColorMode, setLanguage]);

  return settings;
};
