import { useState, useEffect, useRef, useMemo } from 'react';
import { activateWindowFocus } from "../../../shared/ipc/commands";
import { useTagManagerData } from "../hooks/useTagManagerData";
import TagManagerContent from "./TagManagerContent";
import TagManagerDialogs from "./TagManagerDialogs";
import TagManagerSidebar from "./TagManagerSidebar";

interface TagManagerProps {
    t: (key: string) => string;
    theme: string;
}

export default function TagManager({ t, theme }: TagManagerProps) {
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
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [sortBy, setSortBy] = useState<'time' | 'count'>('time');
    const [isCreatingItem, setIsCreatingItem] = useState(false);
    const [editingItem, setEditingItem] = useState<{ id: number, content: string } | null>(null);
    const [newItemContent, setNewItemContent] = useState('');
    const [sidebarWidth, setSidebarWidth] = useState(130);
    const [sidebarHeight, setSidebarHeight] = useState(180);
    const [isResizing, setIsResizing] = useState(false);
    const [isStacked, setIsStacked] = useState(false);
    const [isManageMode, setIsManageMode] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
    const containerRef = useRef<HTMLDivElement>(null);
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

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 340px)");
        const updateLayoutMode = () => {
            setIsStacked(mediaQuery.matches);
        };

        updateLayoutMode();
        mediaQuery.addEventListener("change", updateLayoutMode);

        return () => mediaQuery.removeEventListener("change", updateLayoutMode);
    }, []);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (event: MouseEvent) => {
            const bounds = containerRef.current?.getBoundingClientRect();
            if (!bounds) return;
            if (isStacked) {
                const maxHeight = Math.max(140, bounds.height - 180);
                const nextHeight = Math.min(Math.max(event.clientY - bounds.top, 120), maxHeight);
                setSidebarHeight(nextHeight);
                return;
            }

            const dragPos = event.clientX - bounds.left;
            
            // Auto collapse threshold: 110px
            if (dragPos < 110) {
                if (!isCollapsed) setIsCollapsed(true);
                setSidebarWidth(48);
            } else {
                if (isCollapsed) setIsCollapsed(false);
                const nextWidth = Math.min(dragPos, 320);
                setSidebarWidth(nextWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        document.body.style.cursor = isStacked ? "row-resize" : "col-resize";
        document.body.style.userSelect = "none";
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
    }, [isResizing, isStacked]);

    const createTag = async (rawName: string) => {
        if (await createDataTag(rawName)) {
            setNewTagName('');
            setTagSearch('');
        }
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
            ref={containerRef}
            className={`themed-tag-manager theme-${theme} ${isCollapsed ? 'sidebar-collapsed' : ''} ${isStacked ? 'stacked-layout' : ''}`}
            style={{ 
                ["--tm-sidebar-width" as any]: isCollapsed ? '48px' : `${sidebarWidth}px`,
                ["--tm-sidebar-height" as any]: `${sidebarHeight}px`
            } as any}
            onMouseDown={() => activateWindowFocus().catch(console.error)}
        >
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
                isCollapsed={isCollapsed}
                sidebarWidth={sidebarWidth}
                setTagSearch={setTagSearch}
                setEditingTag={setEditingTag}
                setNewTagName={setNewTagName}
                setIsCollapsed={setIsCollapsed}
                setSidebarWidth={setSidebarWidth}
                setDeleteTagName={(tagName) => setDeleteConfirmation({ show: true, tagName })}
                createTag={createTag}
                renameTag={handleRenameTag}
                loadTagItems={loadTagItems}
                setTagColor={setTagColor}
            />

            {!isCollapsed && (
                <div 
                    className={`tag-divider ${isResizing ? 'active' : ''} ${isStacked ? 'stacked' : ''}`}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setIsResizing(true);
                    }}
                >
                    <div className="tag-divider-handle" />
                </div>
            )}

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
                onDeleteTag={deleteTag}
                onDeleteItems={handleDeleteItems}
                onAddItem={handleAddManualItem}
                onUpdateItem={handleUpdateItemContent}
            />
        </div >
    );
}
