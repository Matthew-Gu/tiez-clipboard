import { create } from "zustand";
import { DEFAULT_THEME } from "../../../shared/config/themes";
import type { Locale } from "../../../shared/types";
import type { AppCleanupPolicy } from "../../settings/types";
import type { DefaultAppsMap, InstalledAppOption, QuickPasteModifier } from "../types";
import type { AppSettings } from "../../../shared/ipc/contracts";
import type { PersistedSettingsSnapshot } from "./settingsSnapshot";

type StateUpdate<T> = T | ((previous: T) => T);
type SettingsSetter<T> = (value: StateUpdate<T>) => void;

export interface SettingsState {
  tagManagerEnabled: boolean;
  autoStart: boolean;
  deduplicate: boolean;
  persistent: boolean;
  persistentLimitEnabled: boolean;
  persistentLimit: number;
  appSettings: Record<string, string>;
  defaultApps: DefaultAppsMap;
  installedApps: InstalledAppOption[];
  dataPath: string;
  hotkey: string;
  sequentialHotkey: string;
  searchHotkey: string;
  quickPasteModifier: QuickPasteModifier;
  sequentialMode: boolean;
  deleteAfterPaste: boolean;
  moveToTopAfterPaste: boolean;
  privacyProtection: boolean;
  privacyProtectionKinds: string[];
  privacyProtectionCustomRules: string;
  sensitiveMaskPrefixVisible: number;
  sensitiveMaskSuffixVisible: number;
  sensitiveMaskEmailDomain: boolean;
  cleanupRules: string;
  appCleanupPolicies: AppCleanupPolicy[];
  captureFiles: boolean;
  silentStart: boolean;
  followMouse: boolean;
  showAppBorder: boolean;
  registryWinVEnabled: boolean;
  pasteMethod: string;
  theme: string;
  colorMode: string;
  showSourceAppIcon: boolean;
  clipboardItemFontSize: number;
  clipboardTagFontSize: number;
  language: Locale;
  settingsLoaded: boolean;
  isWindowPinned: boolean;
  showSearchBox: boolean;
  scrollTopButtonEnabled: boolean;
  arrowKeySelection: boolean;
  hideTrayIcon: boolean;
  customBackground: string;
  customBackgroundOpacity: number;
  surfaceOpacity: number;
  soundEnabled: boolean;
  pasteSoundEnabled: boolean;
  soundVolume: number;
}

interface SettingsActions {
  setTagManagerEnabled: SettingsSetter<boolean>;
  setAutoStart: SettingsSetter<boolean>;
  setDeduplicate: SettingsSetter<boolean>;
  setPersistent: SettingsSetter<boolean>;
  setPersistentLimitEnabled: SettingsSetter<boolean>;
  setPersistentLimit: SettingsSetter<number>;
  setAppSettings: SettingsSetter<Record<string, string>>;
  setDefaultApps: SettingsSetter<DefaultAppsMap>;
  setInstalledApps: SettingsSetter<InstalledAppOption[]>;
  setDataPath: SettingsSetter<string>;
  setHotkey: SettingsSetter<string>;
  setSequentialHotkey: SettingsSetter<string>;
  setSearchHotkey: SettingsSetter<string>;
  setQuickPasteModifier: SettingsSetter<QuickPasteModifier>;
  setSequentialModeState: SettingsSetter<boolean>;
  setDeleteAfterPaste: SettingsSetter<boolean>;
  setMoveToTopAfterPaste: SettingsSetter<boolean>;
  setPrivacyProtection: SettingsSetter<boolean>;
  setPrivacyProtectionKinds: SettingsSetter<string[]>;
  setPrivacyProtectionCustomRules: SettingsSetter<string>;
  setSensitiveMaskPrefixVisible: SettingsSetter<number>;
  setSensitiveMaskSuffixVisible: SettingsSetter<number>;
  setSensitiveMaskEmailDomain: SettingsSetter<boolean>;
  setCleanupRules: SettingsSetter<string>;
  setAppCleanupPolicies: SettingsSetter<AppCleanupPolicy[]>;
  setCaptureFiles: SettingsSetter<boolean>;
  setSilentStart: SettingsSetter<boolean>;
  setFollowMouse: SettingsSetter<boolean>;
  setShowAppBorder: SettingsSetter<boolean>;
  setRegistryWinVEnabled: SettingsSetter<boolean>;
  setPasteMethod: SettingsSetter<string>;
  setTheme: SettingsSetter<string>;
  setColorMode: SettingsSetter<string>;
  setShowSourceAppIcon: SettingsSetter<boolean>;
  setClipboardItemFontSize: SettingsSetter<number>;
  setClipboardTagFontSize: SettingsSetter<number>;
  setLanguage: SettingsSetter<Locale>;
  setSettingsLoaded: SettingsSetter<boolean>;
  setIsWindowPinned: SettingsSetter<boolean>;
  setShowSearchBox: SettingsSetter<boolean>;
  setScrollTopButtonEnabled: SettingsSetter<boolean>;
  setArrowKeySelection: SettingsSetter<boolean>;
  setHideTrayIcon: SettingsSetter<boolean>;
  setCustomBackground: SettingsSetter<string>;
  setCustomBackgroundOpacity: SettingsSetter<number>;
  setSurfaceOpacity: SettingsSetter<number>;
  setSoundEnabled: SettingsSetter<boolean>;
  setPasteSoundEnabled: SettingsSetter<boolean>;
  setSoundVolume: SettingsSetter<number>;
  hydrateSettings: (appSettings: AppSettings, snapshot: PersistedSettingsSnapshot) => void;
  resetSettings: () => void;
}

export type SettingsStore = SettingsState & SettingsActions;

export const createSettingsInitialState = (): SettingsState => ({
  tagManagerEnabled: true,
  autoStart: true,
  deduplicate: true,
  persistent: true,
  persistentLimitEnabled: true,
  persistentLimit: 1000,
  appSettings: {},
  defaultApps: {},
  installedApps: [],
  dataPath: "",
  hotkey: "Alt+C",
  sequentialHotkey: "Alt+V",
  searchHotkey: "Alt+F",
  quickPasteModifier: "disabled",
  sequentialMode: false,
  deleteAfterPaste: false,
  moveToTopAfterPaste: true,
  privacyProtection: true,
  privacyProtectionKinds: ["phone", "idcard", "email", "secret"],
  privacyProtectionCustomRules: "",
  sensitiveMaskPrefixVisible: 3,
  sensitiveMaskSuffixVisible: 3,
  sensitiveMaskEmailDomain: false,
  cleanupRules: "",
  appCleanupPolicies: [],
  captureFiles: true,
  silentStart: true,
  followMouse: false,
  showAppBorder: false,
  registryWinVEnabled: false,
  pasteMethod: "simulate",
  theme: DEFAULT_THEME,
  colorMode: "system",
  showSourceAppIcon: true,
  clipboardItemFontSize: 13,
  clipboardTagFontSize: 10,
  language: "zh",
  settingsLoaded: false,
  isWindowPinned: false,
  showSearchBox: true,
  scrollTopButtonEnabled: true,
  arrowKeySelection: true,
  hideTrayIcon: false,
  customBackground: "",
  customBackgroundOpacity: 45,
  surfaceOpacity: 50,
  soundEnabled: false,
  pasteSoundEnabled: true,
  soundVolume: 1
});

const resolveUpdate = <T>(value: StateUpdate<T>, previous: T): T =>
  typeof value === "function" ? (value as (current: T) => T)(previous) : value;

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...createSettingsInitialState(),
  setTagManagerEnabled: (value) => set((state) => ({ tagManagerEnabled: resolveUpdate(value, state.tagManagerEnabled) })),
  setAutoStart: (value) => set((state) => ({ autoStart: resolveUpdate(value, state.autoStart) })),
  setDeduplicate: (value) => set((state) => ({ deduplicate: resolveUpdate(value, state.deduplicate) })),
  setPersistent: (value) => set((state) => ({ persistent: resolveUpdate(value, state.persistent) })),
  setPersistentLimitEnabled: (value) => set((state) => ({ persistentLimitEnabled: resolveUpdate(value, state.persistentLimitEnabled) })),
  setPersistentLimit: (value) => set((state) => ({ persistentLimit: resolveUpdate(value, state.persistentLimit) })),
  setAppSettings: (value) => set((state) => ({ appSettings: resolveUpdate(value, state.appSettings) })),
  setDefaultApps: (value) => set((state) => ({ defaultApps: resolveUpdate(value, state.defaultApps) })),
  setInstalledApps: (value) => set((state) => ({ installedApps: resolveUpdate(value, state.installedApps) })),
  setDataPath: (value) => set((state) => ({ dataPath: resolveUpdate(value, state.dataPath) })),
  setHotkey: (value) => set((state) => ({ hotkey: resolveUpdate(value, state.hotkey) })),
  setSequentialHotkey: (value) => set((state) => ({ sequentialHotkey: resolveUpdate(value, state.sequentialHotkey) })),
  setSearchHotkey: (value) => set((state) => ({ searchHotkey: resolveUpdate(value, state.searchHotkey) })),
  setQuickPasteModifier: (value) => set((state) => ({ quickPasteModifier: resolveUpdate(value, state.quickPasteModifier) })),
  setSequentialModeState: (value) => set((state) => ({ sequentialMode: resolveUpdate(value, state.sequentialMode) })),
  setDeleteAfterPaste: (value) => set((state) => ({ deleteAfterPaste: resolveUpdate(value, state.deleteAfterPaste) })),
  setMoveToTopAfterPaste: (value) => set((state) => ({ moveToTopAfterPaste: resolveUpdate(value, state.moveToTopAfterPaste) })),
  setPrivacyProtection: (value) => set((state) => ({ privacyProtection: resolveUpdate(value, state.privacyProtection) })),
  setPrivacyProtectionKinds: (value) => set((state) => ({ privacyProtectionKinds: resolveUpdate(value, state.privacyProtectionKinds) })),
  setPrivacyProtectionCustomRules: (value) => set((state) => ({ privacyProtectionCustomRules: resolveUpdate(value, state.privacyProtectionCustomRules) })),
  setSensitiveMaskPrefixVisible: (value) => set((state) => ({ sensitiveMaskPrefixVisible: resolveUpdate(value, state.sensitiveMaskPrefixVisible) })),
  setSensitiveMaskSuffixVisible: (value) => set((state) => ({ sensitiveMaskSuffixVisible: resolveUpdate(value, state.sensitiveMaskSuffixVisible) })),
  setSensitiveMaskEmailDomain: (value) => set((state) => ({ sensitiveMaskEmailDomain: resolveUpdate(value, state.sensitiveMaskEmailDomain) })),
  setCleanupRules: (value) => set((state) => ({ cleanupRules: resolveUpdate(value, state.cleanupRules) })),
  setAppCleanupPolicies: (value) => set((state) => ({ appCleanupPolicies: resolveUpdate(value, state.appCleanupPolicies) })),
  setCaptureFiles: (value) => set((state) => ({ captureFiles: resolveUpdate(value, state.captureFiles) })),
  setSilentStart: (value) => set((state) => ({ silentStart: resolveUpdate(value, state.silentStart) })),
  setFollowMouse: (value) => set((state) => ({ followMouse: resolveUpdate(value, state.followMouse) })),
  setShowAppBorder: (value) => set((state) => ({ showAppBorder: resolveUpdate(value, state.showAppBorder) })),
  setRegistryWinVEnabled: (value) => set((state) => ({ registryWinVEnabled: resolveUpdate(value, state.registryWinVEnabled) })),
  setPasteMethod: (value) => set((state) => ({ pasteMethod: resolveUpdate(value, state.pasteMethod) })),
  setTheme: (value) => set((state) => ({ theme: resolveUpdate(value, state.theme) })),
  setColorMode: (value) => set((state) => ({ colorMode: resolveUpdate(value, state.colorMode) })),
  setShowSourceAppIcon: (value) => set((state) => ({ showSourceAppIcon: resolveUpdate(value, state.showSourceAppIcon) })),
  setClipboardItemFontSize: (value) => set((state) => ({ clipboardItemFontSize: resolveUpdate(value, state.clipboardItemFontSize) })),
  setClipboardTagFontSize: (value) => set((state) => ({ clipboardTagFontSize: resolveUpdate(value, state.clipboardTagFontSize) })),
  setLanguage: (value) => set((state) => ({ language: resolveUpdate(value, state.language) })),
  setSettingsLoaded: (value) => set((state) => ({ settingsLoaded: resolveUpdate(value, state.settingsLoaded) })),
  setIsWindowPinned: (value) => set((state) => ({ isWindowPinned: resolveUpdate(value, state.isWindowPinned) })),
  setShowSearchBox: (value) => set((state) => ({ showSearchBox: resolveUpdate(value, state.showSearchBox) })),
  setScrollTopButtonEnabled: (value) => set((state) => ({ scrollTopButtonEnabled: resolveUpdate(value, state.scrollTopButtonEnabled) })),
  setArrowKeySelection: (value) => set((state) => ({ arrowKeySelection: resolveUpdate(value, state.arrowKeySelection) })),
  setHideTrayIcon: (value) => set((state) => ({ hideTrayIcon: resolveUpdate(value, state.hideTrayIcon) })),
  setCustomBackground: (value) => set((state) => ({ customBackground: resolveUpdate(value, state.customBackground) })),
  setCustomBackgroundOpacity: (value) => set((state) => ({ customBackgroundOpacity: resolveUpdate(value, state.customBackgroundOpacity) })),
  setSurfaceOpacity: (value) => set((state) => ({ surfaceOpacity: resolveUpdate(value, state.surfaceOpacity) })),
  setSoundEnabled: (value) => set((state) => ({ soundEnabled: resolveUpdate(value, state.soundEnabled) })),
  setPasteSoundEnabled: (value) => set((state) => ({ pasteSoundEnabled: resolveUpdate(value, state.pasteSoundEnabled) })),
  setSoundVolume: (value) => set((state) => ({ soundVolume: resolveUpdate(value, state.soundVolume) })),
  hydrateSettings: (appSettings, snapshot) => set({
    ...snapshot,
    appSettings,
    settingsLoaded: true
  }),
  resetSettings: () => set(createSettingsInitialState())
}));

export const selectSettingsLoaded = (state: SettingsStore) => state.settingsLoaded;
export const selectTheme = (state: SettingsStore) => state.theme;
export const selectColorMode = (state: SettingsStore) => state.colorMode;
export const selectLanguage = (state: SettingsStore) => state.language;
