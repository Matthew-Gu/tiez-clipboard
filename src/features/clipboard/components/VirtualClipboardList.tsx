import React, { useRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import type { ListRange } from 'react-virtuoso';
import type { ClipboardEntry } from "../../../shared/types";
import type { VirtualClipboardListHandle, VirtualClipboardListProps } from "../types";

type VirtuosoListContext = {
    header?: React.ReactNode;
    hasMore: boolean;
    isLoading: boolean;
};

const ListHeader = ({ context }: { context?: VirtuosoListContext }) => {
    const header = context?.header;
    return header ? <div className="list-header">{header}</div> : null;
};

const ListFooter = ({ context }: { context?: VirtuosoListContext }) => {
    if (!context) return null;
    const { isLoading, hasMore } = context;
    if (!isLoading && !hasMore) return null;

    return (
        <div style={{
            padding: '20px',
            textAlign: 'center',
            opacity: 0.6,
            fontSize: '12px',
            color: 'var(--text-secondary)'
        }}>
            {isLoading ? '加载中...' : '加载更多...'}
        </div>
    );
};

const VirtualClipboardList = React.forwardRef<VirtualClipboardListHandle, VirtualClipboardListProps>(
    (props, ref) => {
        const {
            items,
            renderItem,
            onLoadMore,
            onLoadNewer,
            onRangeChanged,
            hasMore,
            hasNewer,
            isLoading,
            selectedIndex,
            isKeyboardMode,
            onScroll,
            header,
            firstItemIndex = 0,
            restoreStateFrom,
            onStateSnapshot,
            scrollToTopRequest
        } = props;

        const virtuosoRef = useRef<VirtuosoHandle>(null);
        const visibleRangeRef = useRef<ListRange | null>(null);
        useImperativeHandle(ref, () => ({
            scrollToItem: (index: number) => {
                virtuosoRef.current?.scrollIntoView({
                    index: index + firstItemIndex,
                    behavior: 'smooth',
                    align: 'center',
                });
            },
            scrollToTop: () => {
                virtuosoRef.current?.scrollTo({
                    top: 0,
                    behavior: 'auto'
                });
            },
            resetAfterIndex: (_index: number) => {
                // Not needed with Virtuoso as it handles dynamic heights automatically
            }
        }), [firstItemIndex]);

        React.useLayoutEffect(() => {
            return () => {
                if (!onStateSnapshot) return;
                virtuosoRef.current?.getState(onStateSnapshot);
            };
        }, [onStateSnapshot]);

        React.useLayoutEffect(() => {
            if (!scrollToTopRequest) return;
            let secondFrame = 0;
            const firstFrame = requestAnimationFrame(() => {
                virtuosoRef.current?.scrollTo({ top: 0, behavior: 'auto' });
                secondFrame = requestAnimationFrame(() => {
                    virtuosoRef.current?.scrollTo({ top: 0, behavior: 'auto' });
                });
            });
            return () => {
                cancelAnimationFrame(firstFrame);
                if (secondFrame) cancelAnimationFrame(secondFrame);
            };
        }, [scrollToTopRequest]);

        // Keep keyboard selection visible even when the item is only in overscan
        React.useEffect(() => {
            if (!isKeyboardMode || selectedIndex < 0) return;

            const range = visibleRangeRef.current;
            const edgeBuffer = 1;

            if (!range) {
                virtuosoRef.current?.scrollToIndex({
                    index: selectedIndex + firstItemIndex,
                    behavior: 'auto',
                    align: 'center',
                });
                return;
            }

            if (selectedIndex < range.startIndex + edgeBuffer) {
                virtuosoRef.current?.scrollToIndex({
                    index: selectedIndex + firstItemIndex,
                    behavior: 'auto',
                    align: 'start',
                });
                return;
            }

            if (selectedIndex > range.endIndex - edgeBuffer) {
                virtuosoRef.current?.scrollToIndex({
                    index: selectedIndex + firstItemIndex,
                    behavior: 'auto',
                    align: 'end',
                });
            }
        }, [selectedIndex, isKeyboardMode, firstItemIndex]);


        // Handle scroll events
        const handleScroll = useCallback((scrollTop: number) => {
            onScroll?.(scrollTop);
        }, [onScroll]);

        // Handle end reached for infinite loading
        const handleEndReached = useCallback(() => {
            if (hasMore && !isLoading && onLoadMore) {
                onLoadMore();
            }
        }, [hasMore, isLoading, onLoadMore]);

        const handleRangeChanged = useCallback((range: ListRange) => {
            const normalizedRange = {
                startIndex: Math.max(0, range.startIndex - firstItemIndex),
                endIndex: Math.max(0, range.endIndex - firstItemIndex)
            };
            visibleRangeRef.current = normalizedRange;
            onRangeChanged?.(normalizedRange.startIndex, normalizedRange.endIndex);
        }, [firstItemIndex, onRangeChanged]);

        // Memoized item renderer for Virtuoso
        const itemContent = useCallback((index: number, item: ClipboardEntry) => {
            const localIndex = index - firstItemIndex;
            return (
                <div style={{ paddingBottom: 4 }}>
                    {renderItem(item, localIndex, localIndex === 0)}
                </div>
            );
        }, [renderItem, firstItemIndex]);

        const components = useMemo(() => ({
            Header: ListHeader,
            Footer: ListFooter
        }), []);

        const context = useMemo(() => ({
            header,
            hasMore,
            isLoading
        }), [header, hasMore, isLoading]);

        return (
            <div className="clipboard-list__virtual" style={{ height: '100%', width: '100%' }}>
                <Virtuoso
                    ref={virtuosoRef}
                    data={items}
                    firstItemIndex={firstItemIndex}
                    itemContent={itemContent}
                    components={components}
                    context={context}
                    restoreStateFrom={restoreStateFrom}
                    style={{ height: '100%' }}
                    onScroll={(e) => handleScroll((e.currentTarget as HTMLElement).scrollTop)}
                    endReached={handleEndReached}
                    startReached={() => {
                        if (hasNewer && !isLoading) onLoadNewer?.();
                    }}
                    rangeChanged={handleRangeChanged}
                    overscan={200} // Pre-render 200px of content for smoother scrolling
                />
            </div>
        );
    }
);

VirtualClipboardList.displayName = 'VirtualClipboardList';

export { VirtualClipboardList };
export default VirtualClipboardList;
