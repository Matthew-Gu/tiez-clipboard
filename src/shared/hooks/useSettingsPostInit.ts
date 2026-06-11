import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { MutableRefObject } from "react";
import type { AppCleanupPolicy } from "../../features/settings/types";
import type { QuickPasteModifier } from "../../features/app/types";
import { APP_SETTING_KEYS } from "../ipc/contracts";
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

interface UseSettingsPostInitOptions {
  settings: Record<string, string> | null;
  tagManagerSizeRef: MutableRefObject<{ width: number; height: number } | null>;
  setCustomBackground: (val: string) => void;
  setCustomBackgroundOpacity: (val: number) => void;
  setSurfaceOpacity: (val: number) => void;
  setPersistent: (val: boolean) => void;
  setPersistentLimitEnabled: (val: boolean) => void;
  setPersistentLimit: (val: number) => void;
  setDeduplicate: (val: boolean) => void;
  setCaptureFiles: (val: boolean) => void;
  setCaptureRichText: (val: boolean) => void;
  setRichTextSnapshotPreview: (val: boolean) => void;
  setPrivacyProtection: (val: boolean) => void;
  setPrivacyProtectionKinds: (val: string[]) => void;
  setPrivacyProtectionCustomRules: (val: string) => void;
  setSensitiveMaskPrefixVisible: (val: number) => void;
  setSensitiveMaskSuffixVisible: (val: number) => void;
  setSensitiveMaskEmailDomain: (val: boolean) => void;
  setCleanupRules: (val: string) => void;
  setAppCleanupPolicies: (val: AppCleanupPolicy[]) => void;
  setSilentStart: (val: boolean) => void;
  setFollowMouse: (val: boolean) => void;
  setShowAppBorder: (val: boolean) => void;
  setRegistryWinVEnabled: (val: boolean) => void;
  setPasteMethod: (val: string) => void;
  setShowSourceAppIcon: (val: boolean) => void;

  setDeleteAfterPaste: (val: boolean) => void;
  setMoveToTopAfterPaste: (val: boolean) => void;
  setHideTrayIcon: (val: boolean) => void;
  setEdgeDocking: (val: boolean) => void;
  setShowSearchBox: (val: boolean) => void;
  setScrollTopButtonEnabled: (val: boolean) => void;
  setArrowKeySelection: (val: boolean) => void;
  setSequentialHotkey: (val: string) => void;
  setRichPasteHotkey: (val: string) => void;
  setSearchHotkey: (val: string) => void;
  setQuickPasteModifier: (val: QuickPasteModifier) => void;
  setSequentialModeState: (val: boolean) => void;
  setSoundEnabled: (val: boolean) => void;
  setPasteSoundEnabled: (val: boolean) => void;
  setSoundVolume: (val: number) => void;
  setIsWindowPinned: (val: boolean) => void;
  setSettingsLoaded: (val: boolean) => void;
  setClipboardItemFontSize: (val: number) => void;
  setClipboardTagFontSize: (val: number) => void;
  setTagManagerEnabled: (val: boolean) => void;
}

export const useSettingsPostInit = ({
  settings,
  tagManagerSizeRef,
  setCustomBackground,
  setCustomBackgroundOpacity,
  setSurfaceOpacity,
  setPersistent,
  setPersistentLimitEnabled,
  setPersistentLimit,
  setDeduplicate,
  setCaptureFiles,
  setCaptureRichText,
  setRichTextSnapshotPreview,
  setPrivacyProtection,
  setPrivacyProtectionKinds,
  setPrivacyProtectionCustomRules,
  setSensitiveMaskPrefixVisible,
  setSensitiveMaskSuffixVisible,
  setSensitiveMaskEmailDomain,
  setCleanupRules,
  setAppCleanupPolicies,
  setSilentStart,
  setFollowMouse,
  setShowAppBorder,
  setRegistryWinVEnabled,
  setPasteMethod,
  setShowSourceAppIcon,

  setDeleteAfterPaste,
  setMoveToTopAfterPaste,
  setHideTrayIcon,
  setEdgeDocking,
  setShowSearchBox,
  setScrollTopButtonEnabled,
  setArrowKeySelection,
  setSequentialHotkey,
  setRichPasteHotkey,
  setSearchHotkey,
  setQuickPasteModifier,
  setSequentialModeState,
  setSoundEnabled,
  setPasteSoundEnabled,
  setSoundVolume,
  setIsWindowPinned,
  setSettingsLoaded,
  setClipboardItemFontSize,
  setClipboardTagFontSize,
  setTagManagerEnabled
}: UseSettingsPostInitOptions) => {
  useEffect(() => {
    if (!settings) return;

    if (settings[APP_SETTING_KEYS.tagManagerSize]) {
      try {
        const parsed = JSON.parse(settings[APP_SETTING_KEYS.tagManagerSize]);
        if (parsed && typeof parsed.width === "number" && typeof parsed.height === "number") {
          tagManagerSizeRef.current = { width: parsed.width, height: parsed.height };
        }
      } catch (e) {
        console.warn("Invalid tag manager size:", e);
      }
    }

    // Theme application is centralized in the theme effect below
    if (settings[APP_SETTING_KEYS.customBackground]) setCustomBackground(settings[APP_SETTING_KEYS.customBackground]);
    if (settings[APP_SETTING_KEYS.customBackgroundOpacity]) {
      setCustomBackgroundOpacity(parseInt(settings[APP_SETTING_KEYS.customBackgroundOpacity]));
    }
    if (settings[APP_SETTING_KEYS.surfaceOpacity]) {
      const next = parseInt(settings[APP_SETTING_KEYS.surfaceOpacity]);
      if (Number.isFinite(next)) {
        setSurfaceOpacity(Math.min(100, Math.max(0, next)));
      }
    }
    if (settings[APP_SETTING_KEYS.clipboardItemFontSize]) {
      const next = parseInt(settings[APP_SETTING_KEYS.clipboardItemFontSize]);
      if (Number.isFinite(next)) setClipboardItemFontSize(next);
    }
    if (settings[APP_SETTING_KEYS.clipboardTagFontSize]) {
      const next = parseInt(settings[APP_SETTING_KEYS.clipboardTagFontSize]);
      if (Number.isFinite(next)) setClipboardTagFontSize(next);
    }
    if (settings[APP_SETTING_KEYS.tagManagerEnabled] !== undefined) {
      setTagManagerEnabled(settings[APP_SETTING_KEYS.tagManagerEnabled] !== "false");
    }
    // Fix: explicitly handle both true and false cases for all boolean settings
    setPersistent(settings[APP_SETTING_KEYS.persistent] !== "false");
    setPersistentLimitEnabled(settings[APP_SETTING_KEYS.persistentLimitEnabled] !== "false");
    if (settings[APP_SETTING_KEYS.persistentLimit]) {
      setPersistentLimit(parseInt(settings[APP_SETTING_KEYS.persistentLimit]) || 1000);
    }
    setDeduplicate(settings[APP_SETTING_KEYS.deduplicate] !== "false");
    setCaptureFiles(settings[APP_SETTING_KEYS.captureFiles] !== "false");
    setCaptureRichText(settings[APP_SETTING_KEYS.captureRichText] === "true");
    setRichTextSnapshotPreview(settings[APP_SETTING_KEYS.richTextSnapshotPreview] === "true");
    setPrivacyProtection(settings[APP_SETTING_KEYS.privacyProtection] !== "false");
    if (settings[APP_SETTING_KEYS.privacyProtectionKinds]) {
      const list = settings[APP_SETTING_KEYS.privacyProtectionKinds]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (list.length > 0) setPrivacyProtectionKinds(list);
    }
    if (settings[APP_SETTING_KEYS.privacyProtectionCustomRules] !== undefined) {
      setPrivacyProtectionCustomRules(settings[APP_SETTING_KEYS.privacyProtectionCustomRules] || "");
    }
    if (settings[APP_SETTING_KEYS.sensitiveMaskPrefixVisible]) {
      const next = parseInt(settings[APP_SETTING_KEYS.sensitiveMaskPrefixVisible]);
      if (Number.isFinite(next)) setSensitiveMaskPrefixVisible(Math.min(20, Math.max(0, next)));
    }
    if (settings[APP_SETTING_KEYS.sensitiveMaskSuffixVisible]) {
      const next = parseInt(settings[APP_SETTING_KEYS.sensitiveMaskSuffixVisible]);
      if (Number.isFinite(next)) setSensitiveMaskSuffixVisible(Math.min(20, Math.max(0, next)));
    }
    if (settings[APP_SETTING_KEYS.sensitiveMaskEmailDomain] !== undefined) {
      setSensitiveMaskEmailDomain(settings[APP_SETTING_KEYS.sensitiveMaskEmailDomain] === "true");
    }
    if (settings[APP_SETTING_KEYS.cleanupRules] !== undefined) {
      setCleanupRules(settings[APP_SETTING_KEYS.cleanupRules] || "");
    }
    if (settings[APP_SETTING_KEYS.appCleanupPolicies]) {
      try {
        const parsed = JSON.parse(settings[APP_SETTING_KEYS.appCleanupPolicies]);
        if (Array.isArray(parsed)) {
          setAppCleanupPolicies(
            parsed.filter(
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
            )
          );
        }
      } catch (e) {
        console.warn("Invalid app cleanup policies:", e);
      }
    }
    setSilentStart(settings[APP_SETTING_KEYS.silentStart] !== "false");
    setFollowMouse(settings[APP_SETTING_KEYS.followMouse] === "true");
    setShowAppBorder(settings[APP_SETTING_KEYS.showAppBorder] === "true");
    setRegistryWinVEnabled(settings[APP_SETTING_KEYS.registryWinVEnabled] === "true");
    setPasteMethod(settings[APP_SETTING_KEYS.pasteMethod] || "simulate");
    setShowSourceAppIcon(settings[APP_SETTING_KEYS.showSourceAppIcon] !== "false");


    // These have false as default, so check for 'true'
    setDeleteAfterPaste(settings[APP_SETTING_KEYS.deleteAfterPaste] === "true");
    setMoveToTopAfterPaste(settings[APP_SETTING_KEYS.moveToTopAfterPaste] !== "false");
    setHideTrayIcon(settings[APP_SETTING_KEYS.hideTrayIcon] === "true");
    const edgeDockingEnabled = settings[APP_SETTING_KEYS.edgeDocking] === "true";
    setEdgeDocking(edgeDockingEnabled);

    if (settings[APP_SETTING_KEYS.showSearchBox] === "false") setShowSearchBox(false);
    setScrollTopButtonEnabled(settings[APP_SETTING_KEYS.showScrollTopButton] !== "false");
    if (settings[APP_SETTING_KEYS.arrowKeySelection] === "false") setArrowKeySelection(false);

    if (settings[APP_SETTING_KEYS.sequentialHotkey]) setSequentialHotkey(settings[APP_SETTING_KEYS.sequentialHotkey]);
    if (settings[APP_SETTING_KEYS.richPasteHotkey]) setRichPasteHotkey(settings[APP_SETTING_KEYS.richPasteHotkey]);
    if (settings[APP_SETTING_KEYS.searchHotkey] !== undefined) setSearchHotkey(settings[APP_SETTING_KEYS.searchHotkey]);
    setQuickPasteModifier(normalizeQuickPasteModifier(settings[APP_SETTING_KEYS.quickPasteModifier]));
    if (settings[APP_SETTING_KEYS.sequentialMode] === "true") setSequentialModeState(true);
    if (settings[APP_SETTING_KEYS.soundEnabled] === "true") setSoundEnabled(true);
    setPasteSoundEnabled(settings[APP_SETTING_KEYS.soundPasteEnabled] !== "false");
    if (settings[APP_SETTING_KEYS.soundVolume]) {
      setSoundVolume(parseFloat(settings[APP_SETTING_KEYS.soundVolume]) || 1.0);
    }
    if (settings[APP_SETTING_KEYS.windowPinned] === "true") {
      setIsWindowPinned(true);
      invoke("set_window_pinned", { pinned: true }).catch(console.error);
    }

    setSettingsLoaded(true);
  }, [
    settings,
    tagManagerSizeRef,
    setCustomBackground,
    setCustomBackgroundOpacity,
    setSurfaceOpacity,
    setPersistent,
    setPersistentLimitEnabled,
    setPersistentLimit,
    setDeduplicate,
    setCaptureFiles,
    setCaptureRichText,
    setRichTextSnapshotPreview,
    setPrivacyProtection,
    setPrivacyProtectionKinds,
    setPrivacyProtectionCustomRules,
    setCleanupRules,
    setAppCleanupPolicies,
    setSilentStart,
    setFollowMouse,
    setShowAppBorder,
    setRegistryWinVEnabled,
    setPasteMethod,
    setShowSourceAppIcon,

    setDeleteAfterPaste,
    setMoveToTopAfterPaste,
    setHideTrayIcon,
    setEdgeDocking,
    setShowSearchBox,
    setScrollTopButtonEnabled,
    setArrowKeySelection,
    setSequentialHotkey,
    setRichPasteHotkey,
    setSearchHotkey,
    setQuickPasteModifier,
    setSequentialModeState,
    setSoundEnabled,
    setPasteSoundEnabled,
    setSoundVolume,
    setIsWindowPinned,
    setSettingsLoaded,
    setClipboardItemFontSize,
    setClipboardTagFontSize,
    setTagManagerEnabled
  ]);
};
