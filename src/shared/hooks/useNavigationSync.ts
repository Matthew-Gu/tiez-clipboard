import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { TAURI_COMMANDS } from "../ipc/contracts";

interface UseNavigationSyncOptions {
  showSettings: boolean;
  showTagManager: boolean;
}

export const useNavigationSync = ({
  showSettings,
  showTagManager
}: UseNavigationSyncOptions) => {
  useEffect(() => {
    const shouldDisableNavigation = showSettings || showTagManager;
    if (shouldDisableNavigation) {
      invoke(TAURI_COMMANDS.setNavigationEnabled, { enabled: false }).catch(console.error);
      return;
    }

    // Only enable global navigation when the window is actually visible.
    getCurrentWindow()
      .isVisible()
      .then((visible) => {
        invoke(TAURI_COMMANDS.setNavigationEnabled, { enabled: visible }).catch(console.error);
      })
      .catch(() => {
        invoke(TAURI_COMMANDS.setNavigationEnabled, { enabled: false }).catch(console.error);
      });
  }, [showSettings, showTagManager]);
};
