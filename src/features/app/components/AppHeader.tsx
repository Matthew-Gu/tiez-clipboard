import { useEffect, useRef, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  Pin,
  PinOff,
  Search,
  Settings as SettingsIcon,
  Tag,
  Trash2,
  X
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { activateWindowFocus } from "../../../shared/ipc/commands";
import { getTagColor, getTagTextColor } from "../../../shared/lib/utils";
import { useUiStore } from "../stores/uiStore";
import { createTagSearch, getActiveTagSearch } from "../../tag/tagManagerUi";

interface AppHeaderProps {
  t: (key: string) => string;
  showSettings: boolean;
  showTagManager: boolean;
  onOpenSettings: () => void;
  onOpenTagManager: () => void;
  tagManagerEnabled: boolean;
  isWindowPinned: boolean;
  setIsWindowPinned: (val: boolean) => void;
  clearHistory: () => void;
  showSearchBox: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  allTags: string[];
  theme: string;
  colorMode: string;
  settingsTitle: string;
  onBack: () => void;
}

const AppHeader = ({
  t,
  showSettings,
  showTagManager,
  onOpenSettings,
  onOpenTagManager,
  tagManagerEnabled,
  isWindowPinned,
  setIsWindowPinned,
  clearHistory,
  showSearchBox,
  searchInputRef,
  allTags,
  theme,
  colorMode,
  settingsTitle,
  onBack
}: AppHeaderProps) => {
  const search = useUiStore((state) => state.search);
  const setSearch = useUiStore((state) => state.setSearch);
  const setIsComposing = useUiStore((state) => state.setIsComposing);
  const showTagFilter = useUiStore((state) => state.showTagFilter);
  const setShowTagFilter = useUiStore((state) => state.setShowTagFilter);
  const typeFilter = useUiStore((state) => state.typeFilter);
  const setTypeFilter = useUiStore((state) => state.setTypeFilter);
  const setEditingTagsId = useUiStore((state) => state.setEditingTagsId);
  const activeTagSearch = getActiveTagSearch(search);
  const tagFilterButtonRef = useRef<HTMLDivElement | null>(null);
  const tagFilterMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showTagFilter) return;
    const closeTagFilter = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!tagFilterButtonRef.current?.contains(target) && !tagFilterMenuRef.current?.contains(target)) {
        setShowTagFilter(false);
      }
    };
    document.addEventListener("mousedown", closeTagFilter);
    return () => document.removeEventListener("mousedown", closeTagFilter);
  }, [showTagFilter, setShowTagFilter]);

  const getTypeName = (type: string) => {
    switch (type) {
      case "code": return t('type_code');
      case "link":
      case "url": return t('type_url');
      case "file": return t('type_file');
      case "image": return t('type_image');
      case "video": return t('type_video');
      default: return t('type_text') || 'Text';
    }
  };

  return (
  <header className="app-header window-drag-region">
    <div className="app-header__top">
      <div className="app-header__leading">
        {(showSettings || showTagManager) && (
          <button className="ui-button ui-button--icon window-no-drag" onClick={onBack}>
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="app-header__drag" data-tauri-drag-region>
          <span className="app-header__title">
            {showTagManager && tagManagerEnabled
                ? (t('tag_manager') || '标签管理')
                : showSettings
                  ? settingsTitle
                  : t('app_name')}
          </span>
        </div>
      </div>
      <div className="app-header__actions window-no-drag">
        {/* Pin Button - Always visible but single instance */}
        <button
          className={`ui-button ui-button--icon ${isWindowPinned ? 'ui-button--active' : ''}`}
          title={t('pin')}
          onClick={() => {
            const newVal = !isWindowPinned;
            setIsWindowPinned(newVal);
            invoke("set_window_pinned", { pinned: newVal }).catch(console.error);
          }}
        >
          {isWindowPinned ? <PinOff size={16} /> : <Pin size={16} />}
        </button>

        {!showSettings && !showTagManager && (
          <>
            <button className="ui-button ui-button--icon" title={t('clear_history')} onClick={clearHistory}>
              <Trash2 size={16} />
            </button>
            {tagManagerEnabled && (
              <button className="ui-button ui-button--icon" title={t('tag_manager') || '标签管理'} onClick={onOpenTagManager}>
                <Tag size={16} />
              </button>
            )}
            <button className="ui-button ui-button--icon" title={t('settings')} onClick={onOpenSettings}>
              <SettingsIcon size={16} />
            </button>
          </>
        )}
        <button className="ui-button ui-button--icon" title={t('hide')} onClick={async () => {
          invoke("hide_window_cmd").catch(console.error);
        }}>
          <X size={16} />
        </button>
      </div>
    </div>

    {!showSettings && !showTagManager && (
      <AnimatePresence>
        {(showSearchBox || search.trim().length > 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{
              height: "auto",
              opacity: 1,
              transitionEnd: { overflow: "visible" }
            }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: 0.2, ease: "circOut" }}
            style={{ flexShrink: 0 }}
          >
            <div className="app-header__search window-no-drag">
              <div className="app-header__search-field">
                <Search size={14} className="app-header__search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="ui-input"
                  placeholder={t('search_placeholder')}
                  value={search}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={(e) => {
                    setIsComposing(false);
                    setSearch((e.target as HTMLInputElement).value);
                  }}
                  onChange={(e) => {
                    setSearch(e.target.value);
                  }}
                  onMouseDown={() => {
                    activateWindowFocus().catch(console.error);
                  }}
                  onFocus={() => {
                    activateWindowFocus().catch(console.error);
                    setShowTagFilter(false);
                    setEditingTagsId(null);
                  }}
                  style={{ color: colorMode === 'dark' ? '#ffffff' : undefined }}
                />
              </div>
              <div
                className="app-header__filters ui-scroll--hidden"
                onWheel={(e) => {
                  if (e.deltaY !== 0) {
                    e.currentTarget.scrollLeft += e.deltaY;
                  }
                }}
              >
                {['text', 'image', 'file', 'url', 'code', 'video'].map(t => (
                  <button
                    key={t}
                    className={`ui-button ui-button--icon app-header__filter ${typeFilter === t ? 'app-header__filter--active' : ''}`}
                    onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                    title={getTypeName(t)}
                  >
                    {getTypeName(t)}
                  </button>
                ))}
                {tagManagerEnabled && (
                  <div className="app-header__tag-filter" ref={tagFilterButtonRef}>
                    <button
                      className={`ui-button ui-button--icon app-header__filter ${activeTagSearch !== null ? 'app-header__filter--active' : ''}`}
                      title={t('filter_by_tag')}
                      onClick={() => {
                        if (activeTagSearch !== null) {
                          setSearch("");
                          setShowTagFilter(false);
                        } else {
                          setShowTagFilter((open) => !open);
                        }
                        setEditingTagsId(null);
                      }}
                    >
                      <Tag size={13} />
                      <span>{activeTagSearch || t('tags')}</span>
                    </button>
                  </div>
                )}
              </div>
              {showTagFilter && allTags.length > 0 && (
                <div className="app-header__tag-menu app-header__tag-menu--filter" ref={tagFilterMenuRef}>
                  <div className="app-header__tag-menu-label">{t('filter_by_tag')}</div>
                  <div className="app-header__tag-menu-list">
                    {allTags.map(tag => {
                      const tagBackground = getTagColor(tag, theme);
                      return (
                        <button
                          type="button"
                          className="tag-chip"
                          key={tag}
                          onClick={() => {
                            setSearch(createTagSearch(tag));
                            setShowTagFilter(false);
                          }}
                          data-tag={tag}
                          style={{ background: tagBackground, color: getTagTextColor(tagBackground) }}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )}
  </header>
);
};

export default AppHeader;
