import { useState, useEffect, useMemo } from 'react';
import { activateWindowFocus } from "../../../shared/ipc/commands";
import type { TwoLevelPage } from "../../app/twoLevelPage";
import { transitionTwoLevelPage } from "../../app/twoLevelPage";
import { useTagManagerData } from "../hooks/useTagManagerData";
import TagManagerContent from "./TagManagerContent";
import TagManagerDialogs from "./TagManagerDialogs";
import TagManagerSidebar from "./TagManagerSidebar";

interface TagManagerProps {
    t: (key: string) => string;
    theme: string;
    page: TwoLevelPage;
    onPageChange: (page: TwoLevelPage) => void;
}

export default function TagManager({ t, theme, page, onPageChange }: TagManagerProps) {
    const TAG_MANAGER_VIEW_MODE_KEY = "tiez_tag_manager_view_mode";
    const [tagSearch, setTagSearch] = useState('');
    const [editingTag, setEditingTag] = useState<string | null>(null);
    const [newTagName, setNewTagName] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
        try {
            const saved = window.localStorage.getItem(TAG_MANAGER_VIEW_MODE_KEY);
            return saved === 'list' ? 'list' : 'grid';
        } catch {
            return 'grid';
        }
    });
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ show: boolean, tagName: string | null }>({ show: false, tagName: null });
    const [itemDeleteConfirmation, setItemDeleteConfirmation] = useState<{ show: boolean, id: number | null }>({ show: false, id: null });
    const [sortBy, setSortBy] = useState<'time' | 'count'>('time');
    const [isCreatingItem, setIsCreatingItem] = useState(false);
    const [editingItem, setEditingItem] = useState<{ id: number, content: string } | null>(null);
    const [newItemContent, setNewItemContent] = useState('');
    const [isManageMode, setIsManageMode] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
    const {
        tags,
        selectedTag,
        tagItems,
        tagColors,
        loading,
        loadTagItems,
        createTag: createDataTag,
        renameTag,
        deleteTag,
        setTagColor,
        addManualItem,
        updateItemContent,
        copyItem,
        deleteItems
    } = useTagManagerData();

    useEffect(() => {
        try {
            window.localStorage.setItem(TAG_MANAGER_VIEW_MODE_KEY, viewMode);
        } catch {
            // Ignore storage write failures and keep UI functional.
        }
    }, [viewMode]);

    const createTag = async (rawName: string) => {
        if (await createDataTag(rawName)) {
            setNewTagName('');
            setTagSearch('');
            onPageChange(transitionTwoLevelPage(page, "open-item"));
        }
    };

    const openTag = async (tagName: string) => {
        await loadTagItems(tagName);
        onPageChange(transitionTwoLevelPage(page, "open-item"));
    };

    const handleRenameTag = async (oldName: string) => {
        const trimmed = newTagName.trim();
        if (!trimmed || trimmed === oldName) { setEditingTag(null); return; }
        if (await renameTag(oldName, trimmed)) {
            setEditingTag(null);
            setNewTagName('');
        }
    };

    const handleAddManualItem = async () => {
        if (await addManualItem(newItemContent)) {
            setNewItemContent('');
            setIsCreatingItem(false);
        }
    };

    const handleUpdateItemContent = async () => {
        if (!editingItem || !editingItem.content.trim()) return;
        if (await updateItemContent(editingItem.id, editingItem.content)) {
            setEditingItem(null);
        }
    };

    const handleDeleteItems = async (id: number) => {
        try {
            await deleteItems(id === -1 ? Array.from(selectedItemIds) : [id]);
            if (id === -1) {
                setIsManageMode(false);
                setSelectedItemIds(new Set());
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteTag = async (tagName: string) => {
        await deleteTag(tagName);
        if (selectedTag === tagName) onPageChange(transitionTwoLevelPage(page, "show-list"));
    };

    const filteredTags = useMemo(() => {
        return tags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()));
    }, [tags, tagSearch]);

    const normalizedTagSearch = tagSearch.trim().toLowerCase();
    const canCreateTag = normalizedTagSearch.length > 0
        && !tags.some(tag => tag.name.toLowerCase() === normalizedTagSearch);

    const sortedItems = [...tagItems].sort((a, b) => {
        if (sortBy === 'count') return (b.use_count || 0) - (a.use_count || 0);
        return b.timestamp - a.timestamp;
    });

    return (
        <div
            className={`tag-manager theme-${theme} tag-manager--${page}`}
            onMouseDown={() => activateWindowFocus().catch(console.error)}
        >
            {page === "list" ? (
                <TagManagerSidebar
                    t={t}
                    theme={theme}
                    tags={tags}
                    filteredTags={filteredTags}
                    tagColors={tagColors}
                    selectedTag={selectedTag}
                    tagSearch={tagSearch}
                    normalizedTagSearch={normalizedTagSearch}
                    canCreateTag={canCreateTag}
                    editingTag={editingTag}
                    newTagName={newTagName}
                    setTagSearch={setTagSearch}
                    setEditingTag={setEditingTag}
                    setNewTagName={setNewTagName}
                    setDeleteTagName={(tagName) => setDeleteConfirmation({ show: true, tagName })}
                    createTag={createTag}
                    renameTag={handleRenameTag}
                    openTag={openTag}
                    setTagColor={setTagColor}
                />
            ) : (
                <TagManagerContent
                    t={t}
                    selectedTag={selectedTag}
                    tagItems={tagItems}
                    sortedItems={sortedItems}
                    loading={loading}
                    viewMode={viewMode}
                    sortBy={sortBy}
                    isManageMode={isManageMode}
                    selectedItemIds={selectedItemIds}
                    setViewMode={setViewMode}
                    setSortBy={setSortBy}
                    setIsManageMode={setIsManageMode}
                    setSelectedItemIds={setSelectedItemIds}
                    setItemDeleteId={(id) => setItemDeleteConfirmation({ show: true, id })}
                    setEditingItem={setEditingItem}
                    setIsCreatingItem={setIsCreatingItem}
                    copyItem={copyItem}
                />
            )}

            <TagManagerDialogs
                t={t}
                theme={theme}
                deleteConfirmation={deleteConfirmation}
                itemDeleteConfirmation={itemDeleteConfirmation}
                isCreatingItem={isCreatingItem}
                newItemContent={newItemContent}
                editingItem={editingItem}
                setDeleteConfirmation={setDeleteConfirmation}
                setItemDeleteConfirmation={setItemDeleteConfirmation}
                setIsCreatingItem={setIsCreatingItem}
                setNewItemContent={setNewItemContent}
                setEditingItem={setEditingItem}
                onDeleteTag={handleDeleteTag}
                onDeleteItems={handleDeleteItems}
                onAddItem={handleAddManualItem}
                onUpdateItem={handleUpdateItemContent}
            />
        </div >
    );
}
