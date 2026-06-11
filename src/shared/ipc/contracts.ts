export const TAURI_COMMANDS = {
  activateWindowFocus: "activate_window_focus",
  copyToClipboard: "copy_to_clipboard",
  deleteClipboardEntry: "delete_clipboard_entry",
  focusClipboardWindow: "focus_clipboard_window",
  getClipboardEntryDetail: "get_clipboard_entry_detail",
  getClipboardHistoryPage: "get_clipboard_history_page",
  getSettings: "get_settings",
  openContent: "open_content",
  restoreLastFocus: "restore_last_focus",
  saveSetting: "save_setting",
  searchClipboardHistorySummaries: "search_clipboard_history_summaries",
  setArrowKeySelection: "set_arrow_key_selection",
  setCaptureFiles: "set_capture_files",
  setCaptureRichText: "set_capture_rich_text",
  setDeduplication: "set_deduplication",
  setNavigationEnabled: "set_navigation_enabled",
  setPersistence: "set_persistence",
  setTheme: "set_theme",
  toggleClipboardPin: "toggle_clipboard_pin",
  updateTags: "update_tags"
} as const;

export const TAURI_EVENTS = {
  clipboardChanged: "clipboard-changed",
  clipboardRemoved: "clipboard-removed",
  clipboardUpdated: "clipboard-updated",
  compactPreviewMounted: "compact-preview-mounted",
  compactPreviewUpdate: "compact-preview-update",
  focusSearchInput: "focus-search-input",
  forceHideCompactPreview: "force-hide-compact-preview",
  hotkeyRecorded: "hotkey-recorded",
  navigationAction: "navigation-action",
  playSound: "play-sound",
  recordingCancelled: "recording-cancelled",
  settingsChanged: "settings-changed",
  tagColorsUpdated: "tag-colors-updated",
  toast: "toast",
  windowPinnedChanged: "window-pinned-changed"
} as const;

export const APP_SETTING_KEYS = {
  appCleanupPolicies: "app.app_cleanup_policies",
  arrowKeySelection: "app.arrow_key_selection",
  captureFiles: "app.capture_files",
  captureRichText: "app.capture_rich_text",
  cleanupRules: "app.cleanup_rules",
  clipboardItemFontSize: "app.clipboard_item_font_size",
  clipboardTagFontSize: "app.clipboard_tag_font_size",
  colorMode: "app.color_mode",
  compactMode: "app.compact_mode",
  customBackground: "app.custom_background",
  customBackgroundOpacity: "app.custom_background_opacity",
  deduplicate: "app.deduplicate",
  deleteAfterPaste: "app.delete_after_paste",
  edgeDocking: "app.edge_docking",
  followMouse: "app.follow_mouse",
  hideTrayIcon: "app.hide_tray_icon",
  hotkey: "app.hotkey",
  language: "app.language",
  moveToTopAfterPaste: "app.move_to_top_after_paste",
  pasteMethod: "app.paste_method",
  persistent: "app.persistent",
  persistentLimit: "app.persistent_limit",
  persistentLimitEnabled: "app.persistent_limit_enabled",
  privacyProtection: "app.privacy_protection",
  privacyProtectionCustomRules: "app.privacy_protection_custom_rules",
  privacyProtectionKinds: "app.privacy_protection_kinds",
  quickPasteModifier: "app.quick_paste_modifier",
  registryWinVEnabled: "app.registry_win_v_enabled",
  richPasteHotkey: "app.rich_paste_hotkey",
  richTextSnapshotPreview: "app.rich_text_snapshot_preview",
  searchHotkey: "app.search_hotkey",
  sensitiveMaskEmailDomain: "app.sensitive_mask_email_domain",
  sensitiveMaskPrefixVisible: "app.sensitive_mask_prefix_visible",
  sensitiveMaskSuffixVisible: "app.sensitive_mask_suffix_visible",
  sequentialHotkey: "app.sequential_hotkey",
  sequentialMode: "app.sequential_mode",
  showAppBorder: "app.show_app_border",
  showScrollTopButton: "app.show_scroll_top_button",
  showSearchBox: "app.show_search_box",
  showSourceAppIcon: "app.show_source_app_icon",
  silentStart: "app.silent_start",
  soundEnabled: "app.sound_enabled",
  soundPasteEnabled: "app.sound_paste_enabled",
  soundVolume: "app.sound_volume",
  surfaceOpacity: "app.surface_opacity",
  tagManagerEnabled: "app.tag_manager_enabled",
  tagManagerSize: "app.tag_manager_size",
  theme: "app.theme",
  windowPinned: "app.window_pinned"
} as const;

export type AppSettingKey = (typeof APP_SETTING_KEYS)[keyof typeof APP_SETTING_KEYS];
export type AppSettings = Record<string, string>;

export interface ClipboardHistoryPageArgs extends Record<string, unknown> {
  limit: number;
  direction: "older" | "newer";
  cursorTimestamp?: number;
  cursorId?: number;
  contentType?: string;
  includePinned: boolean;
}

export interface CopyToClipboardArgs extends Record<string, unknown> {
  content: string;
  contentType: string;
  paste: boolean;
  id: number;
  deleteAfterUse: boolean;
  pasteWithFormat?: boolean;
  moveToTop?: boolean;
}

export interface OpenContentArgs extends Record<string, unknown> {
  id: number;
  content: string;
  contentType: string;
}
