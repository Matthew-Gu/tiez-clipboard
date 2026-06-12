import { DEFAULT_THEME, normalizeThemeId } from "../../../shared/config/themes";
import { APP_SETTING_KEYS, type AppSettings } from "../../../shared/ipc/contracts";
import type { Locale } from "../../../shared/types";
import type { AppCleanupPolicy } from "../../settings/types";
import type { QuickPasteModifier } from "../types";
import type { SettingsState } from "./settingsStore";

const QUICK_PASTE_MODIFIERS = new Set<QuickPasteModifier>([
  "disabled",
  "ctrl",
  "alt",
  "shift",
  "win"
]);

const normalizeQuickPasteModifier = (value?: string): QuickPasteModifier => {
  const normalized = value?.trim().toLowerCase();

  switch (normalized) {
    case "control":
      return "ctrl";
    case "option":
      return "alt";
    case "command":
    case "meta":
    case "super":
      return "win";
    default:
      return normalized && QUICK_PASTE_MODIFIERS.has(normalized as QuickPasteModifier)
        ? (normalized as QuickPasteModifier)
        : "disabled";
  }
};

const parseFiniteInt = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = parseInt(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseCleanupPolicies = (value: string | undefined): AppCleanupPolicy[] | undefined => {
  if (!value) return undefined;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return undefined;

    return parsed.filter(
      (item): item is AppCleanupPolicy =>
        !!item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.enabled === "boolean" &&
        typeof item.appName === "string" &&
        typeof item.appPath === "string" &&
        (item.action === "ignore" || item.action === "clean") &&
        Array.isArray(item.contentTypes) &&
        typeof item.cleanupRules === "string"
    );
  } catch {
    return undefined;
  }
};

export type PersistedSettingsSnapshot = Partial<SettingsState>;

export const parseSettingsSnapshot = (settings: AppSettings): PersistedSettingsSnapshot => {
  const snapshot: PersistedSettingsSnapshot = {
    appSettings: settings,
    hotkey: settings[APP_SETTING_KEYS.hotkey] || "Alt+C",
    theme: normalizeThemeId(settings[APP_SETTING_KEYS.theme] || DEFAULT_THEME),
    colorMode: settings[APP_SETTING_KEYS.colorMode] || "system",
    language: (settings[APP_SETTING_KEYS.language] || "zh") as Locale,
    tagManagerEnabled: settings[APP_SETTING_KEYS.tagManagerEnabled] !== "false",
    persistent: settings[APP_SETTING_KEYS.persistent] !== "false",
    persistentLimitEnabled: settings[APP_SETTING_KEYS.persistentLimitEnabled] !== "false",
    deduplicate: settings[APP_SETTING_KEYS.deduplicate] !== "false",
    captureFiles: settings[APP_SETTING_KEYS.captureFiles] !== "false",
    captureRichText: settings[APP_SETTING_KEYS.captureRichText] === "true",
    richTextSnapshotPreview: settings[APP_SETTING_KEYS.richTextSnapshotPreview] === "true",
    privacyProtection: settings[APP_SETTING_KEYS.privacyProtection] !== "false",
    privacyProtectionCustomRules: settings[APP_SETTING_KEYS.privacyProtectionCustomRules] || "",
    sensitiveMaskEmailDomain: settings[APP_SETTING_KEYS.sensitiveMaskEmailDomain] === "true",
    cleanupRules: settings[APP_SETTING_KEYS.cleanupRules] || "",
    silentStart: settings[APP_SETTING_KEYS.silentStart] !== "false",
    followMouse: settings[APP_SETTING_KEYS.followMouse] === "true",
    showAppBorder: settings[APP_SETTING_KEYS.showAppBorder] === "true",
    registryWinVEnabled: settings[APP_SETTING_KEYS.registryWinVEnabled] === "true",
    pasteMethod: settings[APP_SETTING_KEYS.pasteMethod] || "simulate",
    showSourceAppIcon: settings[APP_SETTING_KEYS.showSourceAppIcon] !== "false",
    deleteAfterPaste: settings[APP_SETTING_KEYS.deleteAfterPaste] === "true",
    moveToTopAfterPaste: settings[APP_SETTING_KEYS.moveToTopAfterPaste] !== "false",
    hideTrayIcon: settings[APP_SETTING_KEYS.hideTrayIcon] === "true",
    edgeDocking: settings[APP_SETTING_KEYS.edgeDocking] === "true",
    showSearchBox: settings[APP_SETTING_KEYS.showSearchBox] !== "false",
    scrollTopButtonEnabled: settings[APP_SETTING_KEYS.showScrollTopButton] !== "false",
    arrowKeySelection: settings[APP_SETTING_KEYS.arrowKeySelection] !== "false",
    sequentialHotkey: settings[APP_SETTING_KEYS.sequentialHotkey] || "Alt+V",
    richPasteHotkey: settings[APP_SETTING_KEYS.richPasteHotkey] || "Alt+Shift+V",
    searchHotkey: settings[APP_SETTING_KEYS.searchHotkey] || "Alt+F",
    quickPasteModifier: normalizeQuickPasteModifier(settings[APP_SETTING_KEYS.quickPasteModifier]),
    sequentialMode: settings[APP_SETTING_KEYS.sequentialMode] === "true",
    soundEnabled: settings[APP_SETTING_KEYS.soundEnabled] === "true",
    pasteSoundEnabled: settings[APP_SETTING_KEYS.soundPasteEnabled] !== "false",
    isWindowPinned: settings[APP_SETTING_KEYS.windowPinned] === "true"
  };

  const persistentLimit = parseFiniteInt(settings[APP_SETTING_KEYS.persistentLimit]);
  if (persistentLimit !== undefined) snapshot.persistentLimit = persistentLimit || 1000;

  const customBackground = settings[APP_SETTING_KEYS.customBackground];
  if (customBackground) snapshot.customBackground = customBackground;

  const customBackgroundOpacity = parseFiniteInt(settings[APP_SETTING_KEYS.customBackgroundOpacity]);
  if (customBackgroundOpacity !== undefined) snapshot.customBackgroundOpacity = customBackgroundOpacity;

  const surfaceOpacity = parseFiniteInt(settings[APP_SETTING_KEYS.surfaceOpacity]);
  if (surfaceOpacity !== undefined) snapshot.surfaceOpacity = Math.min(100, Math.max(0, surfaceOpacity));

  const clipboardItemFontSize = parseFiniteInt(settings[APP_SETTING_KEYS.clipboardItemFontSize]);
  if (clipboardItemFontSize !== undefined) snapshot.clipboardItemFontSize = clipboardItemFontSize;

  const clipboardTagFontSize = parseFiniteInt(settings[APP_SETTING_KEYS.clipboardTagFontSize]);
  if (clipboardTagFontSize !== undefined) snapshot.clipboardTagFontSize = clipboardTagFontSize;

  const privacyKinds = settings[APP_SETTING_KEYS.privacyProtectionKinds]
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (privacyKinds?.length) snapshot.privacyProtectionKinds = privacyKinds;

  const sensitiveMaskPrefixVisible = parseFiniteInt(settings[APP_SETTING_KEYS.sensitiveMaskPrefixVisible]);
  if (sensitiveMaskPrefixVisible !== undefined) {
    snapshot.sensitiveMaskPrefixVisible = Math.min(20, Math.max(0, sensitiveMaskPrefixVisible));
  }

  const sensitiveMaskSuffixVisible = parseFiniteInt(settings[APP_SETTING_KEYS.sensitiveMaskSuffixVisible]);
  if (sensitiveMaskSuffixVisible !== undefined) {
    snapshot.sensitiveMaskSuffixVisible = Math.min(20, Math.max(0, sensitiveMaskSuffixVisible));
  }

  const cleanupPolicies = parseCleanupPolicies(settings[APP_SETTING_KEYS.appCleanupPolicies]);
  if (cleanupPolicies) snapshot.appCleanupPolicies = cleanupPolicies;

  const soundVolume = settings[APP_SETTING_KEYS.soundVolume]
    ? parseFloat(settings[APP_SETTING_KEYS.soundVolume])
    : undefined;
  if (soundVolume !== undefined) snapshot.soundVolume = soundVolume || 1;

  return snapshot;
};
