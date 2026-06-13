import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useLocation, useNavigate } from "react-router-dom";
import ToastContainer from "./shared/components/ToastContainer";
import ConfirmDialog from "./shared/components/ConfirmDialog";

import { translations } from "./locales";
import AppHeader from "./features/app/components/AppHeader";
import AppMainContent from "./features/app/components/AppMainContent";
import { useAppState } from "./features/app/hooks/useAppState";
import { useSettingsStore } from "./features/app/stores/settingsStore";
import {
  selectIsKeyboardMode,
  selectSearch,
  selectSelectedTagFilter,
  selectSelectedIndex,
  selectTypeFilter,
  useUiStore
} from "./features/app/stores/uiStore";
import { useSettingsPanelProps } from "./features/settings/hooks/useSettingsPanelProps";
import { useDebounce } from "./shared/hooks/useDebounce";
import { useHistoryFetch } from "./shared/hooks/useHistoryFetch";
import { useHotkeyConfig } from "./shared/hooks/useHotkeyConfig";
import { useInputFocus } from "./shared/hooks/useInputFocus";
import { useSearchScroll } from "./shared/hooks/useSearchScroll";
import { useSettingsApply } from "./shared/hooks/useSettingsApply";
import { useSettingsInit } from "./shared/hooks/useSettingsInit";
import { useSettingsPostInit } from "./shared/hooks/useSettingsPostInit";
import { useSettingsSync } from "./shared/hooks/useSettingsSync";
import { useTagColors } from "./shared/hooks/useTagColors";
import { useClipboardEvents } from "./shared/hooks/useClipboardEvents";
import { useClipboardActions } from "./shared/hooks/useClipboardActions";
import { useSoundEffects } from "./shared/hooks/useSoundEffects";
import { useWindowPinnedListener } from "./shared/hooks/useWindowPinnedListener";
import { useCustomBackground } from "./shared/hooks/useCustomBackground";
import { useToastListener } from "./shared/hooks/useToastListener";
import { useAppBootstrap } from "./shared/hooks/useAppBootstrap";
import { useAppActions } from "./shared/hooks/useAppActions";
import { useNavigationSync } from "./shared/hooks/useNavigationSync";
import { useContextMenuBlock } from "./shared/hooks/useContextMenuBlock";
import { useSettingsPanelReset } from "./shared/hooks/useSettingsPanelReset";
import { useTagManagerRefresh } from "./shared/hooks/useTagManagerRefresh";
import { matchesHotkey } from "./shared/hooks/useHotkeyMatching";
import { usePinnedSort } from "./shared/hooks/usePinnedSort";
import { useFilteredHistory } from "./shared/hooks/useFilteredHistory";
import { useKeyboardNavigation } from "./shared/hooks/useKeyboardNavigation";
import { useListSelectionReset } from "./shared/hooks/useListSelectionReset";
import { useSearchFetchTrigger } from "./shared/hooks/useSearchFetchTrigger";
import { useScrollToSelection } from "./shared/hooks/useScrollToSelection";
import { useClipboardItemRenderer } from "./shared/hooks/useClipboardItemRenderer";
import { useOverlays } from "./shared/hooks/useOverlays";
import type { ClipboardEntry } from "./shared/types";
import type { QuickPasteHint, VirtualClipboardListHandle } from "./features/clipboard/types";

import type { QuickPasteModifier } from "./features/app/types";
import { getMainRouteState, MAIN_ROUTES } from "./features/app/routes";
import { getTwoLevelBackAction, transitionTwoLevelPage } from "./features/app/twoLevelPage";
import type { TwoLevelPage } from "./features/app/twoLevelPage";
import { isTauriRuntime } from "./shared/lib/tauriRuntime";
import { BUILTIN_SENSITIVE_TAG_NAMES } from "./shared/lib/sensitiveTags";
import { activateWindowFocus, saveSetting } from "./shared/ipc/commands";
import { TAURI_EVENTS, toAppSettingKey } from "./shared/ipc/contracts";

const QUICK_PASTE_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;

const buildQuickPasteHintsById = (
  items: ClipboardEntry[],
  quickPasteModifier: QuickPasteModifier
): Record<number, QuickPasteHint> => {
  if (quickPasteModifier === "disabled") {
    return {};
  }

  const modifierLabels: Record<Exclude<QuickPasteModifier, "disabled">, string> = {
    ctrl: "Ctrl+",
    alt: "Alt+",
    shift: "Shift+",
    win: "Win+"
  };
  const pinnedItems = items.filter((item) => item.is_pinned).slice(0, QUICK_PASTE_KEYS.length);

  return pinnedItems.reduce<Record<number, QuickPasteHint>>((acc, item, index) => {
    acc[item.id] = {
      slot: index + 1,
      combo: `${modifierLabels[quickPasteModifier]}${QUICK_PASTE_KEYS[index]}`
    };
    return acc;
  }, {});
};

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isKnownRoute, showSettings, settingsSubpage, showTagManager } =
    getMainRouteState(location.pathname);
  const appState = useAppState();
  const settingsState = useSettingsStore();
  const {
    history,
    setHistory,
    isRecording,
    setIsRecording,
    isRecordingSequential,
    setIsRecordingSequential,
    isRecordingSearch,
    setIsRecordingSearch,
    isLoadingMore,
    setIsLoadingMore,
    hasMore,
    setHasMore,
    currentOffset,
    setCurrentOffset
  } = appState;
  const search = useUiStore(selectSearch);
  const setSearch = useUiStore((state) => state.setSearch);
  const isComposing = useUiStore((state) => state.isComposing);
  const showTagFilter = useUiStore((state) => state.showTagFilter);
  const selectedTagFilter = useUiStore(selectSelectedTagFilter);
  const typeFilter = useUiStore(selectTypeFilter);
  const setCollapsedGroups = useUiStore((state) => state.setCollapsedGroups);
  const editingTagsId = useUiStore((state) => state.editingTagsId);
  const selectedIndex = useUiStore(selectSelectedIndex);
  const setSelectedIndex = useUiStore((state) => state.setSelectedIndex);
  const isKeyboardMode = useUiStore(selectIsKeyboardMode);
  const setIsKeyboardMode = useUiStore((state) => state.setIsKeyboardMode);
  const {
    tagManagerEnabled,
    setAutoStart,
    deduplicate,
    persistent,
    persistentLimitEnabled,
    persistentLimit,
    appSettings,
    setAppSettings,
    setDefaultApps,
    setInstalledApps,
    setDataPath,
    hotkey,
    setHotkey,
    sequentialHotkey,
    setSequentialHotkey,
    searchHotkey,
    setSearchHotkey,
    quickPasteModifier,
    sequentialMode,
    deleteAfterPaste,
    moveToTopAfterPaste,
    privacyProtection,
    sensitiveMaskPrefixVisible,
    sensitiveMaskSuffixVisible,
    sensitiveMaskEmailDomain,
    captureFiles,
    showAppBorder,
    theme,
    colorMode,
    showSourceAppIcon,
    clipboardItemFontSize,
    clipboardTagFontSize,
    language,
    settingsLoaded,
    isWindowPinned,
    setIsWindowPinned,
    showSearchBox,
    setShowSearchBox,
    scrollTopButtonEnabled,
    arrowKeySelection,
    customBackground,
    customBackgroundOpacity,
    surfaceOpacity,
    soundEnabled,
    pasteSoundEnabled,
    soundVolume
  } = settingsState;

  const effectiveShowTagManager = showTagManager && tagManagerEnabled;
  const debouncedSearch = useDebounce(search, 400);
  const searchInputRef = useInputFocus<HTMLInputElement>();
  const tagColors = useTagColors();
  const virtualListRef = useRef<VirtualClipboardListHandle | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [tagManagerPage, setTagManagerPage] = useState<TwoLevelPage>("list");
  const [advancedSettingsPage, setAdvancedSettingsPage] = useState<TwoLevelPage>("list");
  const [quickPasteHintsById, setQuickPasteHintsById] = useState<Record<number, QuickPasteHint>>(
    {}
  );
  const PAGE_SIZE = 80;
  const {
    fetchHistory,
    loadMoreHistory,
    loadNewerHistory,
    hydratedHistory,
    firstItemIndex,
    hasNewer,
    prefetchVisibleRange,
    prefetchDetails,
    handleSummaryUpdated,
    handleRemoved
  } = useHistoryFetch({
    debouncedSearch,
    selectedTagFilter,
    typeFilter,
    persistentLimitEnabled,
    persistentLimit,
    pageSize: PAGE_SIZE,
    currentOffset,
    historyLength: history.length,
    history,
    setHistory,
    setCurrentOffset,
    setHasMore,
    isLoadingMore,
    hasMore,
    setIsLoadingMore
  });

  const t = useCallback((key: string) => {
    const k = key as keyof typeof translations['zh'];
    return translations[language][k] || translations['en'][k] || key;
  }, [language]);

  const { handleListScroll: handleSearchScroll, handleMainWheel } = useSearchScroll({
    showSearchBox,
    setShowSearchBox,
    search,
    showSettings,
    showTagManager: effectiveShowTagManager,
    appSettings
  });

  const showScrollTopVisible = showScrollTop && scrollTopButtonEnabled;

  const handleHeaderBack = useCallback(() => {
    if (effectiveShowTagManager) {
      if (getTwoLevelBackAction(tagManagerPage) === "show-list") {
        setTagManagerPage((page) => transitionTwoLevelPage(page, "show-list"));
        return;
      }
      navigate(MAIN_ROUTES.home);
      return;
    }
    if (showSettings) {
      if (settingsSubpage !== "home") {
        if (getTwoLevelBackAction(advancedSettingsPage) === "show-list") {
          setAdvancedSettingsPage((page) => transitionTwoLevelPage(page, "show-list"));
          return;
        }
        navigate(MAIN_ROUTES.settings);
        return;
      }
      navigate(MAIN_ROUTES.home);
    }
  }, [
    advancedSettingsPage,
    effectiveShowTagManager,
    navigate,
    settingsSubpage,
    showSettings,
    tagManagerPage
  ]);

  useEffect(() => {
    if (!effectiveShowTagManager) setTagManagerPage("list");
  }, [effectiveShowTagManager]);

  useEffect(() => {
    if (!showSettings || settingsSubpage !== "advanced") setAdvancedSettingsPage("list");
  }, [settingsSubpage, showSettings]);

  useEffect(() => {
    if (!isKnownRoute) {
      navigate(MAIN_ROUTES.home, { replace: true });
    }
  }, [isKnownRoute, navigate]);

  const handleListScroll = useCallback((offset: number) => {
    handleSearchScroll(offset);
    setShowScrollTop(offset > 200);
  }, [handleSearchScroll]);

  const handleScrollTop = useCallback(() => {
    if (virtualListRef.current?.scrollToTop) {
      virtualListRef.current.scrollToTop();
      return;
    }
    virtualListRef.current?.scrollToItem(0);
  }, []);

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const hotkeyParts = useMemo(
    () => (hotkey || '').split('+').map((part) => part.trim()).filter(Boolean),
    [hotkey]
  );

  // Compute all tags when tag manager / tag filter is open, or while editing an item's tags (quick-pick list)
  const allTags = useMemo(() => {
    if (!effectiveShowTagManager && !showTagFilter && !selectedTagFilter && editingTagsId === null) return [];

    const set = new Set<string>();
    for (const tag of BUILTIN_SENSITIVE_TAG_NAMES) {
      set.add(tag);
    }
    history.forEach((item) => {
      (item.tags || []).forEach((tag) => set.add(tag));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [history, effectiveShowTagManager, showTagFilter, selectedTagFilter, editingTagsId]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (isRecording || isRecordingSequential || isRecordingSearch) return;
      if (!hotkey || hotkey === t('not_set')) return;

      const activeEl = document.activeElement as HTMLElement | null;
      const isEditable = !!activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );

      if (matchesHotkey(event, hotkey)) {
        event.preventDefault();
        invoke("toggle_window_cmd").catch(console.error);
        return;
      }

      if (!isEditable && hotkey.toUpperCase().includes('WIN') && matchesHotkey(event, hotkey, { ignoreWin: true })) {
        event.preventDefault();
        invoke("toggle_window_cmd").catch(console.error);
      }
    };

    window.addEventListener('keydown', handleKeydown, true);
    return () => window.removeEventListener('keydown', handleKeydown, true);
  }, [hotkey, isRecording, isRecordingSequential, isRecordingSearch, t]);


  const { toasts, pushToast, confirmDialog, openConfirm, closeConfirm } = useOverlays();

  useSoundEffects({ soundEnabled, pasteSoundEnabled, soundVolume });

  const tagManagerSizeRef = useRef<{ width: number; height: number } | null>(null);

  const settings = useSettingsInit();

  useSettingsPostInit({
    settings,
    tagManagerSizeRef
  });

  useEffect(() => {
    if (!isTauriRuntime()) return;

    const unlisten = listen(TAURI_EVENTS.focusSearchInput, () => {
      navigate(MAIN_ROUTES.home);
      setShowSearchBox(true);
      activateWindowFocus()
        .catch(console.error)
        .finally(() => {
          requestAnimationFrame(() => {
            searchInputRef.current?.focus();
          });
        });
    });

    return () => {
      unlisten.then((off) => off());
    };
  }, [
    navigate,
    setShowSearchBox,
    searchInputRef
  ]);

  useEffect(() => {
    if (!tagManagerEnabled && showTagManager) {
      navigate(MAIN_ROUTES.home, { replace: true });
    }
  }, [navigate, tagManagerEnabled, showTagManager]);

  useAppBootstrap({
    setDataPath,
    setInstalledApps,
    setAutoStart,
    setDefaultApps
  });

  useWindowPinnedListener({
    onPinnedChange: setIsWindowPinned
  });

  useContextMenuBlock();

  useSettingsApply({
    theme,
    colorMode,

    settingsLoaded,
    clipboardItemFontSize,
    clipboardTagFontSize,
    surfaceOpacity,
    showAppBorder
  });

  useCustomBackground({ customBackground, customBackgroundOpacity, theme });

  useClipboardEvents({
    onUpdated: handleSummaryUpdated,
    onRemoved: handleRemoved,
    onChanged: () => {
      fetchHistory(true);
    }
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    setQuickPasteHintsById(buildQuickPasteHintsById(history, quickPasteModifier));
  }, [history, quickPasteModifier]);

  useToastListener({ pushToast });

  useSettingsPanelReset({ showSettings, setCollapsedGroups });

  useTagManagerRefresh({
    showTagManager: effectiveShowTagManager,
    settingsLoaded,
    persistentLimitEnabled,
    persistentLimit,
    fetchHistory
  });

  const saveAppSetting = useCallback(async (type: string, path: string) => {
    const key = toAppSettingKey(type);
    console.log(`[THEME DEBUG] saveAppSetting called: key=${key}, value=${path}`);

    // Sync theme-related settings to localStorage for instant startup (prevents flash)
    try {
      if (type === 'theme') localStorage.setItem('tiez_theme', path);
      if (type === 'color_mode') localStorage.setItem('tiez_color_mode', path);
    } catch (e) {
      // Ignore localStorage errors
    }

    try {
      await saveSetting(toAppSettingKey(type), path);
      setAppSettings(prev => ({ ...prev, [key]: path }));
      console.log(`[THEME DEBUG] saveAppSetting success: key=${key}`);
    } catch (err) {
      console.error("保存设置失败", err);
    }
  }, [setAppSettings]);

  useSettingsSync({
    settingsLoaded,
    deduplicate,
    saveAppSetting,
    captureFiles,
    persistent,
    arrowKeySelection,
    soundVolume,
    setIsKeyboardMode,
    setSelectedIndex
  });

  const {
    checkHotkeyConflict,
    updateHotkey,
    updateSequentialHotkey,
    updateSearchHotkey
  } =
    useHotkeyConfig({
      hotkey,
      setHotkey,
      sequentialHotkey,
      setSequentialHotkey,
      searchHotkey,
      setSearchHotkey,
      sequentialMode,
      isRecording,
      setIsRecording,
      isRecordingSequential,
      setIsRecordingSequential,
      isRecordingSearch,
      setIsRecordingSearch,
      saveAppSetting,
      t,
      pushToast
    });

  useNavigationSync({ showSettings, showTagManager: effectiveShowTagManager });

  const { copyToClipboard, openContent, deleteEntry, togglePin, handleUpdateTags } =
    useClipboardActions({
      t,
      pushToast,
      deleteAfterPaste,
      moveToTopAfterPaste,
      setSearch,
      setHistory,
      virtualListRef
    });

  const { clearHistory, handleResetSettings } = useAppActions({
    t,
    openConfirm,
    closeConfirm,
    pushToast,
    fetchHistory
  });

  /*
  const updateItemContent = async (id: number, newContent: string) => {
    try {
      await invoke("update_item_content", { id, newContent });
      // Local state will be refreshed by fetchHistory triggered by clipboard-changed event
    } catch (err) {
      console.error("Failed to update item content", err);
    }
  };
  */

  const filteredHistory = useFilteredHistory({
    history: hydratedHistory,
    search,
    selectedTagFilter,
    typeFilter
  });

  const effectiveHasMore = hasMore && filteredHistory.length >= PAGE_SIZE;

  const { pinnedItems, unpinnedItems, handlePinnedReorder } = usePinnedSort({
    filteredHistory,
    history,
    setHistory
  });

  useListSelectionReset({ filteredHistory, setSelectedIndex });

  useSearchFetchTrigger({ debouncedSearch, isComposing, selectedTagFilter, typeFilter, fetchHistory });

  useScrollToSelection({
    filteredHistory,
    selectedIndex,
    isKeyboardMode,
    pinnedCount: pinnedItems.length,
    virtualListRef
  });

  useKeyboardNavigation({
    filteredHistory,
    selectedIndex,
    setSelectedIndex,
    isKeyboardMode,
    setIsKeyboardMode,
    showSettings,
    showTagManager: effectiveShowTagManager,
    editingTagsId,
    arrowKeySelection,
    searchInputRef,
    copyToClipboard,
    setSearch
  });


  const { renderItemContent } = useClipboardItemRenderer({
    privacyProtection,
    isWindowPinned,
    allTags,
    tagColors,
    theme,
    language,
    t,
    showSourceAppIcon,
    sensitiveMaskPrefixVisible,
    sensitiveMaskSuffixVisible,
    sensitiveMaskEmailDomain,
    quickPasteHintsById,
    copyToClipboard,
    prefetchDetails,
    openContent,
    togglePin,
    deleteEntry,
    handleUpdateTags,
  });

  const settingsPanelProps = useSettingsPanelProps({
    t,
    hotkeyParts,
    checkHotkeyConflict,
    updateHotkey,
    updateSequentialHotkey,
    updateSearchHotkey,
    saveAppSetting,
    handleResetSettings,
    toggleGroup,
    settingsSubpage,
    advancedSettingsPage,
    setAdvancedSettingsPage,
    openAdvancedSettings: () => navigate(MAIN_ROUTES.advancedSettings),
    state: appState
  });

  return (
    <div
      className="app-shell"
    >
      <AppHeader
        t={t}
        showSettings={showSettings}
        showTagManager={effectiveShowTagManager}
        onOpenSettings={() => navigate(MAIN_ROUTES.settings)}
        onOpenTagManager={() => navigate(MAIN_ROUTES.tags)}
        tagManagerEnabled={tagManagerEnabled}
        isWindowPinned={isWindowPinned}
        setIsWindowPinned={setIsWindowPinned}
        clearHistory={clearHistory}
        showSearchBox={showSearchBox}
        searchInputRef={searchInputRef}
        allTags={allTags}
        theme={theme}
        colorMode={colorMode}
        settingsTitle={showSettings && settingsSubpage === "advanced" ? t("advanced_settings") : t("settings")}
        onBack={handleHeaderBack}
      />

      <main
        className={`app-shell__main${effectiveShowTagManager ? " app-shell__main--tag-manager" : ""}`}
        style={{
          overflowY: (showSettings || effectiveShowTagManager) ? 'auto' : 'hidden',
          padding: effectiveShowTagManager ? '0' : undefined
        }}
        onWheel={handleMainWheel}
      >
        <AppMainContent
          t={t}
          theme={theme}
          showSettings={showSettings}
          showTagManager={effectiveShowTagManager}
          tagManagerEnabled={tagManagerEnabled}
          tagManagerPage={tagManagerPage}
          onTagManagerPageChange={setTagManagerPage}
          settingsPanelProps={settingsPanelProps}
          filteredHistory={filteredHistory}
          pinnedItems={pinnedItems}
          unpinnedItems={unpinnedItems}
          virtualListRef={virtualListRef}
          handlePinnedReorder={handlePinnedReorder}
          renderItemContent={renderItemContent}
          loadMoreHistory={loadMoreHistory}
          loadNewerHistory={loadNewerHistory}
          handleVisibleRange={prefetchVisibleRange}
          handleListScroll={handleListScroll}
          hasMore={effectiveHasMore}
          hasNewer={hasNewer}
          isLoadingMore={isLoadingMore}
          firstItemIndex={firstItemIndex}
          showScrollTop={showScrollTopVisible}
          onScrollTop={handleScrollTop}
        />
      </main>

      <ToastContainer toasts={toasts} />

      <ConfirmDialog
        open={confirmDialog.show}
        title={confirmDialog.title}
        message={confirmDialog.message}
        theme={theme}
        confirmLabel={t('confirm')}
        cancelLabel={t('cancel')}
        onClose={closeConfirm}
        onConfirm={confirmDialog.onConfirm}
      />

    </div >
  );
}

export default App;
