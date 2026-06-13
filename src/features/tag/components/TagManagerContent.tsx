import { convertFileSrc } from "@tauri-apps/api/core";
import type { Dispatch, SetStateAction } from "react";
import { CheckSquare, Clock, Copy, Edit2, ExternalLink, LayoutGrid, List, MousePointer2, Plus, Trash2, X } from "lucide-react";
import { copyToClipboard, openContent } from "../../../shared/ipc/commands";
import type { ClipboardEntry } from "../../../shared/types";
import { toggleAllSelectedItems, toggleSelectedItem } from "../tagManagerUi";

interface TagManagerContentProps {
    t: (key: string) => string;
    selectedTag: string | null;
    tagItems: ClipboardEntry[];
    sortedItems: ClipboardEntry[];
    loading: boolean;
    viewMode: 'list' | 'grid';
    sortBy: 'time' | 'count';
    isManageMode: boolean;
    selectedItemIds: Set<number>;
    setViewMode: (value: 'list' | 'grid') => void;
    setSortBy: (value: 'time' | 'count') => void;
    setIsManageMode: (value: boolean) => void;
    setSelectedItemIds: Dispatch<SetStateAction<Set<number>>>;
    setItemDeleteId: (id: number) => void;
    setEditingItem: (item: { id: number; content: string }) => void;
    setIsCreatingItem: (value: boolean) => void;
    copyItem: (id: number, content: string, contentType: string) => Promise<void>;
}

const formatItemDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const TagManagerContent = ({
    t,
    selectedTag,
    tagItems,
    sortedItems,
    loading,
    viewMode,
    sortBy,
    isManageMode,
    selectedItemIds,
    setViewMode,
    setSortBy,
    setIsManageMode,
    setSelectedItemIds,
    setItemDeleteId,
    setEditingItem,
    setIsCreatingItem,
    copyItem
}: TagManagerContentProps) => (
    <div className="tag-manager__detail-page">
        <div className={`tag-manager__toolbar ${isManageMode ? 'tag-manager__toolbar--managing' : ''}`}>
            {isManageMode ? (
                <>
                    <div className="tag-manager__batch-summary">
                        <CheckSquare size={15} />
                        <span>{t('selected_count')} {selectedItemIds.size}</span>
                    </div>
                    <div className="tag-manager__batch-actions">
                        <button className="tag-manager__batch-button" onClick={() => setSelectedItemIds((previous) => toggleAllSelectedItems(previous, sortedItems.map((item) => item.id)))}>
                            <CheckSquare size={14} /><span>{selectedItemIds.size === sortedItems.length && sortedItems.length > 0 ? t('clear_selection') : t('select_all')}</span>
                        </button>
                        <button
                            className="tag-manager__batch-button tag-manager__batch-button--primary"
                            disabled={selectedItemIds.size === 0}
                            onClick={async () => {
                                const selectedItems = tagItems.filter((item) => selectedItemIds.has(item.id));
                                if (selectedItems.length === 0) return;
                                await copyToClipboard({
                                    content: selectedItems.map((item) => item.content).join('\n'),
                                    contentType: 'text',
                                    paste: true,
                                    id: -1,
                                    deleteAfterUse: false
                                });
                                setIsManageMode(false);
                                setSelectedItemIds(new Set());
                            }}
                        >
                            <Copy size={14} /><span>{t('copy_selected') || '复制选中'}</span>
                        </button>
                        <button className="tag-manager__batch-button tag-manager__batch-button--danger" disabled={selectedItemIds.size === 0} onClick={() => setItemDeleteId(-1)}>
                            <Trash2 size={14} /><span>{t('delete_selected') || '删除选中'}</span>
                        </button>
                        <button className="tag-manager__batch-button" onClick={() => {
                            setIsManageMode(false);
                            setSelectedItemIds(new Set());
                        }}>
                            <X size={14} /><span>{t('exit_manage')}</span>
                        </button>
                    </div>
                </>
            ) : (
            <>
            <div className="tag-manager__toolbar-main">
                <div className="tag-manager__selection">
                    <span className="tag-manager__selection-marker">#</span>
                    <span className="tag-manager__selection-text">{selectedTag || t('tags')}</span>
                </div>
                <div className="tag-manager__toolbar-divider" />
                <div className="tag-manager__sort">
                    <button className={`tag-manager__sort-button ${sortBy === 'time' ? 'tag-manager__sort-button--active' : ''}`} title={t('sort_time') || '按时间'} onClick={() => setSortBy('time')}>
                        <Clock size={12} /><span>{t('sort_time') || '时间'}</span>
                    </button>
                    <button className={`tag-manager__sort-button ${sortBy === 'count' ? 'tag-manager__sort-button--active' : ''}`} title={t('sort_usage') || '按频率'} onClick={() => setSortBy('count')}>
                        <MousePointer2 size={12} /><span>{t('sort_usage') || '频率'}</span>
                    </button>
                </div>
            </div>
            <div className="tag-manager__toolbar-actions">
                {selectedTag && (
                    <div className="tag-manager__management-actions">
                        <button className="tag-manager__sort-button tag-manager__manage-button" onClick={() => setIsManageMode(true)} title={t('manage_items') || '管理条目'}>
                            <CheckSquare size={14} /><span>{t('manage') || '管理'}</span>
                        </button>
                    </div>
                )}
                <div className="tag-manager__view-toggle">
                    <button type="button" className={`tag-manager__view-button ui-button ui-button--icon ${viewMode === 'list' ? 'tag-manager__view-button--active' : ''}`} title="列表视图" onClick={() => setViewMode('list')}><List size={14} /></button>
                    <button type="button" className={`tag-manager__view-button ui-button ui-button--icon ${viewMode === 'grid' ? 'tag-manager__view-button--active' : ''}`} title="卡片视图" onClick={() => setViewMode('grid')}><LayoutGrid size={14} /></button>
                </div>
            </div>
            </>
            )}
        </div>

        <div className="tag-manager__items ui-scroll">
            {loading ? <div className="tag-manager__items-status">{t('processing')}</div> : sortedItems.length === 0 ? (
                <div className="tag-manager__items-status">{selectedTag ? t('no_items') : t('select_tag_to_begin')}</div>
            ) : (
                <div className={`tag-manager__items-${viewMode} ${isManageMode ? 'tag-manager__items--managing' : ''}`}>
                    {sortedItems.map((item) => (
                        <div
                            key={item.id}
                            className={`tag-manager__card ${selectedItemIds.has(item.id) ? 'tag-manager__card--selected' : ''}`}
                            onClick={() => {
                                if (isManageMode) {
                                    setSelectedItemIds((previous) => toggleSelectedItem(previous, item.id));
                                } else {
                                    copyItem(item.id, item.content, item.content_type);
                                }
                            }}
                        >
                            <div className="tag-manager__card-header">
                                <div className="tag-manager__card-actions">
                                    {isManageMode ? (
                                        <div className={`tag-manager__selection-control ${selectedItemIds.has(item.id) ? 'tag-manager__selection-control--checked' : ''}`}><div className="tag-manager__selection-check" /></div>
                                    ) : (
                                        <>
                                            {(item.content_type === 'text' || item.content_type === 'code') && (
                                                <button className="tag-manager__card-action" title="编辑" onClick={(event) => {
                                                    event.stopPropagation();
                                                    setEditingItem({ id: item.id, content: item.content });
                                                }}><Edit2 size={10} /></button>
                                            )}
                                            <button
                                                className="tag-manager__card-action"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openContent({ id: item.id, content: item.content, contentType: item.content_type });
                                                }}
                                                title={t('open')}
                                            ><ExternalLink size={10} /></button>
                                        </>
                                    )}
                                </div>
                                {!isManageMode && (
                                    <button className="tag-manager__card-delete" title="删除" onClick={(event) => {
                                        event.stopPropagation();
                                        setItemDeleteId(item.id);
                                    }}><X size={10} /></button>
                                )}
                            </div>

                            {item.content_type === 'image' ? (
                                <div className="tag-manager__card-media">
                                    <img src={item.content.startsWith('data:') ? item.content : convertFileSrc(item.content)} alt="" className="tag-manager__card-image" loading="lazy" />
                                </div>
                            ) : (
                                <div className="tag-manager__card-body">{item.preview || item.content}</div>
                            )}

                            <div className="tag-manager__card-divider" />
                            <div className="tag-manager__card-footer">
                                <span className="tag-manager__card-time">{formatItemDate(item.timestamp)}</span>
                                <div className="tag-manager__card-usage"><MousePointer2 size={8} /> {item.use_count || 0}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        {selectedTag && !isManageMode && (
            <button className="tag-manager__fab" onClick={(event) => {
                event.stopPropagation();
                setIsCreatingItem(true);
            }} title={t('add_item')}><Plus size={24} /></button>
        )}
    </div>
);

export default TagManagerContent;
