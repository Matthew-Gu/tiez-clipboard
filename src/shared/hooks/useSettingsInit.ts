import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useSettingsStore } from "../../features/app/stores/settingsStore";
import { parseSettingsSnapshot } from "../../features/app/stores/settingsSnapshot";
import type { AppSettings } from "../ipc/contracts";
import { TAURI_EVENTS } from "../ipc/contracts";
import { getSettings } from "../ipc/commands";
import { isTauriRuntime } from "../lib/tauriRuntime";

export const useSettingsInit = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const settingsEffectCount = useRef(0);
  const hydrateSettings = useSettingsStore((state) => state.hydrateSettings);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    let disposed = false;

    const loadSettings = () => {
      settingsEffectCount.current++;

      getSettings()
        .then((result) => {
          if (disposed) return;

          const snapshot = parseSettingsSnapshot(result);
          hydrateSettings(result, snapshot);
          setSettings(result);

          try {
            localStorage.setItem("tiez_theme", String(snapshot.theme));
            localStorage.setItem("tiez_color_mode", String(snapshot.colorMode));
          } catch {
            // Ignore localStorage errors
          }
        })
        .catch(console.error);
    };

    loadSettings();

    const unlisten = listen(TAURI_EVENTS.settingsChanged, loadSettings);

    return () => {
      disposed = true;
      unlisten.then((off) => off());
    };
  }, [hydrateSettings]);

  return settings;
};
