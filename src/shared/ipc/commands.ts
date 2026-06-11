import { invoke } from "@tauri-apps/api/core";
import type {
  AppSettingKey,
  AppSettings,
  CopyToClipboardArgs,
  OpenContentArgs
} from "./contracts";
import { TAURI_COMMANDS } from "./contracts";

export const getSettings = (): Promise<AppSettings> =>
  invoke<AppSettings>(TAURI_COMMANDS.getSettings);

export const saveSetting = (key: AppSettingKey, value: string): Promise<void> =>
  invoke(TAURI_COMMANDS.saveSetting, { key, value });

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
