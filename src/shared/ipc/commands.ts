import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import type {
  AppSettingKey,
  AppSettings,
  CopyToClipboardArgs,
  OpenContentArgs
} from "./contracts";
import { TAURI_COMMANDS } from "./contracts";
import { TAURI_EVENTS } from "./contracts";

export const runSettingWrite = async (
  write: () => Promise<void>,
  notify: () => Promise<void>
): Promise<void> => {
  await write();
  await notify();
};

export const notifySettingsChanged = (): Promise<void> =>
  emit(TAURI_EVENTS.settingsChanged);

export const getSettings = (): Promise<AppSettings> =>
  invoke<AppSettings>(TAURI_COMMANDS.getSettings);

export const saveSetting = (key: AppSettingKey, value: string): Promise<void> =>
  runSettingWrite(
    () => invoke(TAURI_COMMANDS.saveSetting, { key, value }),
    notifySettingsChanged
  );

export const copyToClipboard = (args: CopyToClipboardArgs): Promise<void> =>
  invoke(TAURI_COMMANDS.copyToClipboard, args);

export const openContent = (args: OpenContentArgs): Promise<void> =>
  invoke(TAURI_COMMANDS.openContent, args);

export const deleteClipboardEntry = (id: number): Promise<void> =>
  invoke(TAURI_COMMANDS.deleteClipboardEntry, { id });

export const activateWindowFocus = (): Promise<void> =>
  invoke(TAURI_COMMANDS.activateWindowFocus);

export const focusClipboardWindowCommand = (): Promise<void> =>
  invoke(TAURI_COMMANDS.focusClipboardWindow);

export const restoreLastFocusCommand = (): Promise<void> =>
  invoke(TAURI_COMMANDS.restoreLastFocus);
