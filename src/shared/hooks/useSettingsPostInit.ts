import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { MutableRefObject } from "react";
import type { AppSettings } from "../ipc/contracts";
import { APP_SETTING_KEYS } from "../ipc/contracts";

interface UseSettingsPostInitOptions {
  settings: AppSettings | null;
  tagManagerSizeRef: MutableRefObject<{ width: number; height: number } | null>;
}

export const useSettingsPostInit = ({
  settings,
  tagManagerSizeRef
}: UseSettingsPostInitOptions) => {
  useEffect(() => {
    if (!settings) return;

    if (settings[APP_SETTING_KEYS.tagManagerSize]) {
      try {
        const parsed = JSON.parse(settings[APP_SETTING_KEYS.tagManagerSize]);
        if (parsed && typeof parsed.width === "number" && typeof parsed.height === "number") {
          tagManagerSizeRef.current = { width: parsed.width, height: parsed.height };
        }
      } catch (error) {
        console.warn("Invalid tag manager size:", error);
      }
    }

    if (settings[APP_SETTING_KEYS.windowPinned] === "true") {
      invoke("set_window_pinned", { pinned: true }).catch(console.error);
    }
  }, [settings, tagManagerSizeRef]);
};
