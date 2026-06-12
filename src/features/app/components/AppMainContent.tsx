import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps, RefObject, ReactNode } from "react";
import { motion, Reorder, useDragControls } from "framer-motion";
import type { DragControls } from "framer-motion";
import type { StateSnapshot } from "react-virtuoso";
import { ArrowUp, Clipboard } from "lucide-react";
import SettingsPanel from "../../settings/components/SettingsPanel";
import TagManager from "../../tag/components/TagManager";
import { VirtualClipboardList } from "../../clipboard/components/VirtualClipboardList";
import type { ClipboardEntry } from "../../../shared/types";
import type { VirtualClipboardListHandle } from "../../clipboard/types";
import { useUiStore } from "../stores/uiStore";

type SettingsPanelProps = ComponentProps<typeof SettingsPanel>;
type RenderItem = (
  item: ClipboardEntry,
  index: number,
  dragControls?: DragControls,
  disableLayout?: boolean
) => ReactNode;

interface AppMainContentProps {
  t: (key: string) => string;
  theme: string;
  showSettings: boolean;
  showTagManager: boolean;
  tagManagerEnabled: boolean;
  settingsPanelProps: SettingsPanelProps;
  filteredHistory: ClipboardEntry[];
  pinnedItems: ClipboardEntry[];
  unpinnedItems: ClipboardEntry[];
  selectedIndex: number;
  isKeyboardMode: boolean;
  virtualListRef: RefObject<VirtualClipboardListHandle | null>;
  handlePinnedReorder: (newOrderIds: number[]) => void;
  renderItemContent: RenderItem;
  loadMoreHistory: () => void;
  loadNewerHistory: () => void;
  handleVisibleRange: (startIndex: number, endIndex: number) => void;
  handleListScroll: (offset: number) => void;
  hasMore: boolean;
  hasNewer: boolean;
  isLoadingMore: boolean;
  firstItemIndex: number;
  showScrollTop: boolean;
  onScrollTop: () => void;
}

const SortableItem = ({
  item,
  index,
  renderItem,
  isFirst,
  onDragStart,
  onDragEnd
}: {
  item: ClipboardEntry;
  index: number;
  renderItem: RenderItem;
  isFirst?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) => {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item.id}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={isFirst ? "first-virtual-item" : undefined}
      style={{
        listStyle: "none",
        overflow: "visible",
        paddingTop: isFirst ? "4px" : undefined
      }}
    >
      <div style={{ paddingBottom: "4px" }}>
        {renderItem(item, index, controls, true)}
      </div>
    </Reorder.Item>
  );
};

const AppMainContent = ({
  t,
  theme,
  showSettings,
  showTagManager,
  tagManagerEnabled,
  settingsPanelProps,
  filteredHistory,
  pinnedItems,
  unpinnedItems,
  selectedIndex,
  isKeyboardMode,
  virtualListRef,
  handlePinnedReorder,
  renderItemContent,
  loadMoreHistory,
  loadNewerHistory,
  handleVisibleRange,
  handleListScroll,
  hasMore,
  hasNewer,
  isLoadingMore,
  firstItemIndex,
  showScrollTop,
  onScrollTop
}: AppMainContentProps) => {
  const search = useUiStore((state) => state.search);
  const [pinnedOrderIds, setPinnedOrderIds] = useState<number[]>(
    () => pinnedItems.map((item) => item.id)
  );
  const pinnedOrderRef = useRef<number[]>(pinnedItems.map((item) => item.id));
  const [isDraggingPinned, setIsDraggingPinned] = useState(false);
  const homeListSnapshotRef = useRef<StateSnapshot | null>(null);
  const homeVisibleRef = useRef(true);
  const homeVisible = !showSettings && !(showTagManager && tagManagerEnabled);
  homeVisibleRef.current = homeVisible;

  useEffect(() => {
    if (homeVisible && filteredHistory.length === 0) {
      homeListSnapshotRef.current = null;
    }
  }, [filteredHistory.length, homeVisible]);

  const handleHomeListSnapshot = useCallback((snapshot: StateSnapshot) => {
    if (!homeVisibleRef.current) {
      homeListSnapshotRef.current = snapshot;
    }
  }, []);

  useEffect(() => {
    if (isDraggingPinned) return;
    const next = pinnedItems.map((item) => item.id);
    setPinnedOrderIds(next);
    pinnedOrderRef.current = next;
  }, [pinnedItems, isDraggingPinned]);

  const orderedPinnedItems = useMemo(() => {
    if (pinnedItems.length === 0) return [];
    const map = new Map<number, ClipboardEntry>();
    pinnedItems.forEach((item) => map.set(item.id, item));

    const ordered: ClipboardEntry[] = [];
    const seen = new Set<number>();

    pinnedOrderIds.forEach((id) => {
      const item = map.get(id);
      if (!item) return;
      ordered.push(item);
      seen.add(id);
    });

    pinnedItems.forEach((item) => {
      if (!seen.has(item.id)) {
        ordered.push(item);
      }
    });

    return ordered;
  }, [pinnedItems, pinnedOrderIds]);

  const orderedPinnedIds = useMemo(
    () => orderedPinnedItems.map((item) => item.id),
    [orderedPinnedItems]
  );

  const handlePinnedIdsReorder = useCallback((nextIds: number[]) => {
    setPinnedOrderIds(nextIds);
    pinnedOrderRef.current = nextIds;
  }, []);

  const handlePinnedDragStart = useCallback(() => {
    setIsDraggingPinned(true);
  }, []);

  const handlePinnedDragEnd = useCallback(() => {
    setIsDraggingPinned(false);
    const finalIds = pinnedOrderRef.current;
    const currentIds = pinnedItems.map((item) => item.id);
    if (
      finalIds.length === currentIds.length &&
      finalIds.every((id, idx) => id === currentIds[idx])
    ) {
      return;
    }
    handlePinnedReorder(finalIds);
  }, [handlePinnedReorder, pinnedItems]);

  if (showTagManager && tagManagerEnabled) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        style={{ height: "100%" }}
      >
        <TagManager t={t} theme={theme} />
      </motion.div>
    );
  }

  if (showSettings) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`settings-view ${settingsPanelProps.settingsSubpage === "advanced" ? "advanced-view-shell" : ""}`}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: settingsPanelProps.settingsSubpage === "advanced" ? "0" : "12px",
          height: "100%",
          maxHeight: "100%",
          width: "100%",
          maxWidth: settingsPanelProps.settingsSubpage === "advanced" ? "none" : undefined
        }}
      >
        <SettingsPanel {...settingsPanelProps} />
      </motion.div>
    );
  }

  if (filteredHistory.length === 0) {
    return (
      <div className="empty-state">
        <Clipboard size={40} opacity={0.2} style={{ marginBottom: "12px" }} />
        {search ? (
          <p>{t("no_records")}</p>
        ) : (
          <>
            <p
              style={{
                fontSize: "15px",
                fontWeight: "bold",
                color: "var(--text-primary)",
                marginBottom: "4px"
              }}
            >
              {t("empty_title")}
            </p>
            <p style={{ fontSize: "12px", opacity: 0.6 }}>{t("empty_desc")}</p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {filteredHistory.length > 0 && (
        <div className="history-list-container">
          <VirtualClipboardList
            ref={virtualListRef}
            items={unpinnedItems}
            selectedIndex={selectedIndex - pinnedItems.length}
            isKeyboardMode={isKeyboardMode}
            header={
              pinnedItems.length > 0 ? (
                <Reorder.Group
                  axis="y"
                  values={orderedPinnedIds}
                  onReorder={handlePinnedIdsReorder}
                  className={isDraggingPinned ? "pinned-reorder dragging" : "pinned-reorder"}
                  style={{ listStyle: "none", padding: 0 }}
                >
                  {orderedPinnedItems.map((item, index) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      index={index}
                      renderItem={renderItemContent}
                      isFirst={index === 0}
                      onDragStart={handlePinnedDragStart}
                      onDragEnd={handlePinnedDragEnd}
                    />
                  ))}
                </Reorder.Group>
              ) : null
            }
            renderItem={(item, index, isFirst?: boolean) => {
              const el = renderItemContent(item, pinnedItems.length + index, undefined, true);
              if (isFirst && pinnedItems.length === 0) {
                return (
                  <div className="first-virtual-item" style={{ height: "100%", paddingTop: "4px" }}>
                    {el}
                  </div>
                );
              }
              return el;
            }}
            onLoadMore={loadMoreHistory}
            onLoadNewer={loadNewerHistory}
            onRangeChanged={handleVisibleRange}
            onScroll={handleListScroll}
            hasMore={hasMore}
            hasNewer={hasNewer}
            isLoading={isLoadingMore}
            firstItemIndex={firstItemIndex}
            restoreStateFrom={homeListSnapshotRef.current ?? undefined}
            onStateSnapshot={handleHomeListSnapshot}
          />
          {showScrollTop && (
            <button
              type="button"
              className="btn-icon scroll-top-button"
              onClick={onScrollTop}
              aria-label={t("scroll_to_top")}
              title={t("scroll_to_top")}
            >
              <ArrowUp size={16} />
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default AppMainContent;
