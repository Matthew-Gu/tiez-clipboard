import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TAURI_COMMANDS } from "../ipc/contracts";
import { notifySettingsChanged, runSettingWrite } from "../ipc/commands";

interface UseSettingsSyncOptions {
  settingsLoaded: boolean;
  deduplicate: boolean;
  saveAppSetting: (type: string, value: string) => void;
  captureFiles: boolean;
  persistent: boolean;
  soundVolume: number;
  arrowKeySelection: boolean;
  setIsKeyboardMode: (val: boolean) => void;
  setSelectedIndex: (val: number) => void;
}

export const useSettingsSync = ({
  settingsLoaded,
  deduplicate,
  saveAppSetting,
  captureFiles,
  persistent,
  soundVolume,
  arrowKeySelection,
  setIsKeyboardMode,
  setSelectedIndex
}: UseSettingsSyncOptions) => {
  useEffect(() => {
    if (settingsLoaded) {
      invoke(TAURI_COMMANDS.setDeduplication, { enabled: deduplicate });
      saveAppSetting("deduplicate", String(deduplicate));
    }
  }, [deduplicate, saveAppSetting, settingsLoaded]);

  useEffect(() => {
    if (settingsLoaded) {
      runSettingWrite(
        () => invoke(TAURI_COMMANDS.setCaptureFiles, { enabled: captureFiles }),
        notifySettingsChanged
      ).catch(console.error);
    }
  }, [captureFiles, settingsLoaded]);

  useEffect(() => {
    if (settingsLoaded) {
      runSettingWrite(
        () => invoke(TAURI_COMMANDS.setPersistence, { enabled: persistent }),
        notifySettingsChanged
      ).catch(console.error);
    }
  }, [persistent, settingsLoaded]);

  useEffect(() => {
    if (settingsLoaded) {
      saveAppSetting("sound_volume", String(soundVolume));
    }
  }, [saveAppSetting, settingsLoaded, soundVolume]);

  useEffect(() => {
    runSettingWrite(
      () => invoke(TAURI_COMMANDS.setArrowKeySelection, { enabled: arrowKeySelection }),
      notifySettingsChanged
    ).catch(console.error);
    if (!arrowKeySelection) {
      setIsKeyboardMode(false);
      setSelectedIndex(0);
    }
  }, [arrowKeySelection, setIsKeyboardMode, setSelectedIndex]);
};
