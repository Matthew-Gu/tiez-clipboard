import { convertFileSrc } from "@tauri-apps/api/core";
import type { Dispatch, SetStateAction } from "react";
import { CheckSquare, Clock, Copy, Edit2, ExternalLink, LayoutGrid, List, MousePointer2, Plus, Trash2, X } from "lucide-react";
import { copyToClipboard, openContent } from "../../../shared/ipc/commands";
import type { ClipboardEntry } from "../../../shared/types";

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
    <div className="tag-content">
        <div className="content-toolbar">
            <div className="toolbar-left">
                <div className="selected-tag-indicator">
                    <span className="breadcrumb-marker">#</span>
                    <span className="breadcrumb-text">{selectedTag || t('tags')}</span>
                </div>
                <div className="toolbar-divider" />
                <div className="sort-group">
                    <button className={`sort-btn ${sortBy === 'time' ? 'active' : ''}`} title={t('sort_time') || '按时间'} onClick={() => setSortBy('time')}>
                        <Clock size={12} /><span>{t('sort_time') || '时间'}</span>
                    </button>
                    <button className={`sort-btn ${sortBy === 'count' ? 'active' : ''}`} title={t('sort_usage') || '按频率'} onClick={() => setSortBy('count')}>
                        <MousePointer2 size={12} /><span>{t('sort_usage') || '频率'}</span>
                    </button>
                </div>
            </div>
            <div className="toolbar-right">
                {selectedTag && (
                    <div className="toolbar-actions">
                        {isManageMode ? (
                            <>
                                <button className="sort-btn" onClick={() => {
                                    setIsManageMode(false);
                                    setSelectedItemIds(new Set());
                                }}>{t('cancel') || '取消'}</button>
                                <button className="sort-btn danger" disabled={selectedItemIds.size === 0} onClick={() => setItemDeleteId(-1)}>
                                    <Trash2 size={14} /><span>{t('delete_selected') || '删除选中'}</span>
                                </button>
                                <button
                                    className="sort-btn active"
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
                            </>
                        ) : (
                            <button className="sort-btn manage-btn" onClick={() => setIsManageMode(true)} title={t('manage_items') || '管理条目'}>
                                <CheckSquare size={14} /><span>{t('manage') || '管理'}</span>
                            </button>
                        )}
                    </div>
                )}
                <div className="view-toggle">
                    <button type="button" className={`toggle-btn ui-button ui-button--icon ${viewMode === 'list' ? 'active' : ''}`} title="列表视图" onClick={() => setViewMode('list')}><List size={14} /></button>
                    <button type="button" className={`toggle-btn ui-button ui-button--icon ${viewMode === 'grid' ? 'active' : ''}`} title="卡片视图" onClick={() => setViewMode('grid')}><LayoutGrid size={14} /></button>
                </div>
            </div>
        </div>

        <div className="items-area ui-scroll">
            {loading ? <div className="status-msg">{t('processing')}</div> : sortedItems.length === 0 ? (
                <div className="status-msg">{selectedTag ? t('no_items') : t('select_tag_to_begin')}</div>
            ) : (
                <div className={`items-${viewMode} ${isManageMode ? 'manage-mode' : ''}`}>
                    {sortedItems.map((item) => (
                        <div
                            key={item.id}
                            className={`themed-card ${selectedItemIds.has(item.id) ? 'selected' : ''}`}
                            onClick={() => {
                                if (isManageMode) {
                                    setSelectedItemIds((previous) => {
                                        const next = new Set(previous);
                                        if (next.has(item.id)) next.delete(item.id);
                                        else next.add(item.id);
                                        return next;
                                    });
                                } else {
                                    copyItem(item.id, item.content, item.content_type);
                                }
                            }}
                        >
                            <div className="card-top-row">
                                <div className="card-actions-left">
                                    {isManageMode ? (
                                        <div className={`selection-indicator ${selectedItemIds.has(item.id) ? 'checked' : ''}`}><div className="inner-check" /></div>
                                    ) : (
                                        <>
                                            {(item.content_type === 'text' || item.content_type === 'code') && (
                                                <button className="card-action-btn" title="编辑" onClick={(event) => {
                                                    event.stopPropagation();
                                                    setEditingItem({ id: item.id, content: item.content });
                                                }}><Edit2 size={10} /></button>
                                            )}
                                            <button
                                                className="card-action-btn"
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
                                    <button className="del-btn" title="删除" onClick={(event) => {
                                        event.stopPropagation();
                                        setItemDeleteId(item.id);
                                    }}><X size={10} /></button>
                                )}
                            </div>

                            {item.content_type === 'image' ? (
                                <div className="card-media">
                                    <img src={item.content.startsWith('data:') ? item.content : convertFileSrc(item.content)} alt="" className="image-preview" loading="lazy" />
                                </div>
                            ) : (
                                <div className="card-body-text">{item.preview || item.content}</div>
                            )}

                            <div className="card-divider" />
                            <div className="card-footer">
                                <span className="meta-time">{formatItemDate(item.timestamp)}</span>
                                <div className="meta-usage"><MousePointer2 size={8} /> {item.use_count || 0}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        {selectedTag && !isManageMode && (
            <button className="fab-add-btn" onClick={(event) => {
                event.stopPropagation();
                setIsCreatingItem(true);
            }} title={t('add_item')}><Plus size={24} /></button>
        )}
    </div>
);

export default TagManagerContent;
