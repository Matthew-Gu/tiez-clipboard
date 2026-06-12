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
            <style>{`
                .themed-tag-manager {
                    display: grid;
                    grid-template-columns: var(--tag-sidebar-width, 130px) auto 1fr;
                    height: 100%;
                    background: var(--bg-content);
                    font-family: var(--font-main, ui-monospace, monospace);
                    color: var(--text-primary);
                    gap: 0;
                    padding: 0;
                }

                /* Sidebar */
                .tag-sidebar {
                    width: var(--tag-sidebar-width, 130px);
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                    background: var(--bg-panel);
                    border-radius: 0;
                    box-shadow: none;
                    overflow: hidden;
                    border: var(--panel-border);
                }
                .sidebar-collapsed .tag-sidebar { width: 48px; }
                
                .sidebar-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--panel-divider-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    min-height: auto;
                    background: transparent;
                    color: var(--text-secondary);
                    font-size: 13px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .header-actions { display: flex; align-items: center; gap: 8px; }
                .action-btn { background: transparent; border: none; color: inherit; cursor: pointer; padding: 2px; opacity: 0.7; transition: opacity 0.2s; }
                .action-btn:hover { opacity: 1; }
                .collapse-toggle { 
                    background: var(--bg-main); 
                    border: none; 
                    color: inherit; 
                    cursor: pointer; 
                    display: flex; 
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    height: 28px;
                    border-radius: var(--radius-sm);
                    transition: all 0.2s;
                }
                .collapse-toggle:hover { background: var(--border-light); color: var(--text-primary); }

                /* Tag Search Box */
                .tag-search-box {
                    padding: 12px 16px;
                    display: flex; align-items: center; gap: 6px;
                    background: transparent;
                    border-bottom: 1px solid var(--panel-divider-color);
                    margin: 0;
                    min-height: auto;
                    position: relative;
                }
                .tag-search-box .search-icon-placeholder { opacity: 0.3; color: var(--text-primary); flex-shrink: 0; }
                .tag-search-box input {
                    width: 100%;
                    background: var(--bg-main); 
                    border: 1px solid var(--border); 
                    outline: none;
                    font-size: 13px; 
                    font-weight: 500; 
                    color: var(--text-primary);
                    padding: 10px 12px 10px 36px;
                    flex: 1;
                    min-width: 0; 
                    border-radius: var(--radius-sm);
                    transition: all 0.2s;
                }
                .tag-search-box input:focus {
                    border-color: var(--accent-color);
                    background: var(--bg-panel);
                    box-shadow: 0 0 0 3px var(--accent-light);
                }
                .tag-search-box input::placeholder { color: var(--text-muted); opacity: 0.7; font-style: normal; font-size: 13px; }
                
                .action-icons { display: flex; align-items: center; gap: 4px; }
                .action-icon { cursor: pointer; opacity: 0.5; color: var(--text-primary); transition: all 0.15s; }
                .action-icon:hover { opacity: 1; transform: scale(1.1); }
                .action-icon.create { color: var(--accent-color); opacity: 0.8; }
                .action-icon.create:hover { opacity: 1; }

                .tag-scroll { flex: 1; overflow-y: auto; padding: 8px; overflow-x: hidden; }
                /* Tag Item Layout: [Color] [Name (Flex)] [Actions (Hover)] [Badge] */
                .tag-item {
                    display: flex; 
                    align-items: center; 
                    gap: 10px;
                    padding: 10px 12px; 
                    cursor: pointer;
                    margin-bottom: 2px; 
                    border: 1px solid transparent;
                    border-radius: var(--radius-sm);
                    transition: all 0.15s;
                    position: relative;
                    overflow: hidden;
                    width: 100%;
                }
                .tag-item:hover { background: var(--bg-main); }
                .tag-item.active { 
                    background: var(--accent-light); 
                    border-color: transparent;
                    box-shadow: none;
                }
                .tag-item.create-hint { border: 1px dashed var(--border); opacity: 0.8; }
                .tag-item.create-hint:hover { background: var(--bg-main); border-style: solid; }

                .sidebar-collapsed .tag-item { justify-content: center; padding: 10px 0; gap: 0; }
                .sidebar-collapsed .tag-name,
                .sidebar-collapsed .tag-badge,
                .sidebar-collapsed .tag-hover-actions { display: none; }
                .sidebar-collapsed .tag-color-wrapper { width: 100%; justify-content: center; }
                .tag-color-wrapper { display: flex; align-items: center; justify-content: center; }
                .tag-color-dot { 
                    width: 10px; 
                    height: 10px; 
                    border-radius: 50%; 
                    flex-shrink: 0; 
                    cursor: pointer; 
                    border: none;
                    transition: transform 0.2s; 
                }
                .tag-color-dot:hover { transform: scale(1.2); }
                .tag-name { 
                    flex: 1; 
                    font-size: 13px; 
                    font-weight: 500; 
                    white-space: nowrap; 
                    overflow: hidden; 
                    text-overflow: ellipsis; 
                    min-width: 0; 
                    margin-right: 4px;
                }
                
                /* Inline Edit Input */
                .inline-tag-edit {
                    flex: 1; 
                    border: 1px solid var(--border); 
                    background: var(--bg-main); 
                    color: var(--text-primary); 
                    font-size: 13px; 
                    font-weight: 500;
                    padding: 6px 10px; 
                    border-radius: var(--radius-sm);
                    min-width: 0; 
                    outline: none;
                    box-shadow: 0 0 0 3px var(--accent-light);
                }

                /* Actions group: Hidden by default, Flex on hover */
                .tag-hover-actions { 
                    display: none; 
                    gap: 4px; 
                    align-items: center; 
                    margin-left: auto;
                    flex-shrink: 0;
                }
                .tag-item:hover .tag-hover-actions { display: flex; }
                .tag-item:hover .tag-badge { display: none; }
                
                .tag-badge { 
                    font-size: 11px; 
                    font-weight: 600; 
                    color: var(--text-secondary); 
                    background: var(--bg-main); 
                    padding: 2px 8px; 
                    border-radius: 10px;
                    min-width: auto;
                    text-align: center;
                }
                .tag-item.active .tag-badge {
                    background: var(--accent-color);
                    color: white;
                }
                
                .tag-hover-actions > *:hover { color: var(--accent-color); }
                .tag-item.active .tag-hover-actions > * { opacity: 0.8; }
                .tag-item.active .tag-hover-actions > *:hover { opacity: 1; color: var(--accent-color); }

                /* Content Area */
                .tag-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
                .content-toolbar {
                    height: 48px; border-bottom: 1px solid var(--panel-divider-color);
                    background: var(--bg-panel);
                    display: flex; align-items: center; justify-content: space-between; padding: 0 16px;
                }
                .toolbar-left { display: flex; align-items: center; gap: 12px; }
                .selected-tag-indicator { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 14px; color: var(--text-primary); }
                .breadcrumb-marker { color: var(--accent-color); }

                .sort-group { display: flex; gap: 6px; padding-left: 12px; border-left: 1px solid var(--panel-divider-color); }
                .sort-btn { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: var(--radius-sm); transition: all 0.15s; }
                .sort-btn:hover { background: var(--bg-main); color: var(--text-primary); }
                .sort-btn.active { background: var(--accent-light); color: var(--accent-color); }

                .view-toggle {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 2px;
                    border: 1px solid var(--panel-divider-color);
                    border-radius: var(--radius-sm);
                    background: var(--bg-main);
                }
                .toggle-btn {
                    padding: 4px;
                    border-radius: var(--radius-sm);
                    transition: all 0.15s;
                }
                .toggle-btn:hover { background: var(--bg-input); }
                .toggle-btn.active { background: var(--accent-color); color: white; }

                .items-area { 
                    flex: 1; 
                    overflow-y: auto; 
                    padding: 16px 16px 80px 16px; 
                    background: var(--bg-content); 
                    position: relative;
                }

                .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
                .items-list { display: flex; flex-direction: column; gap: 8px; }

                .themed-card {
                    background: var(--bg-element);
                    border: 1px solid var(--border);
                    padding: 12px; cursor: pointer;
                    position: relative;
                    border-radius: var(--radius-md);
                    transition: all 0.15s ease;
                }
                .themed-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px var(--shadow); border-color: var(--accent-color); }

                .del-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; opacity: 0.4; transition: opacity 0.15s; }
                .del-btn:hover { opacity: 1; color: #ff4d4f; }

                .card-media { min-height: 60px; border-radius: var(--radius-sm); margin: 8px 0; overflow: hidden; background: var(--bg-main); display: flex; justify-content: center; align-items: center; }
                .card-media img { max-width: 100%; max-height: 140px; object-fit: contain; border-radius: var(--radius-sm); }
                
                .card-body-text { font-size: 13px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; color: var(--text-primary); }
                .card-footer { display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: var(--text-secondary); opacity: 0.8; }
                .meta-usage { display: flex; align-items: center; gap: 4px; }
                
                .add-item-btn {
                    margin-left: 12px;
                }

                .card-top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
                .card-actions-left { display: flex; gap: 6px; }
                .card-action-btn {
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    padding: 4px;
                    border-radius: var(--radius-sm);
                    opacity: 0.6;
                    transition: all 0.15s;
                }
                .card-action-btn:hover { opacity: 1; color: var(--accent-color); background: var(--bg-main); }

                /* Overlay */
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(4px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 2000;
                }


                /* Confirm Dialog - Modern Style */
                .modal-overlay .confirm-dialog {
                    background: var(--bg-panel) !important;
                    padding: 24px;
                    border: 1px solid var(--border) !important;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important;
                    border-radius: var(--radius-lg) !important;
                    width: 400px;
                    max-width: 90%;
                    animation: modal-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                @keyframes modal-pop {
                    0% { transform: scale(0.95); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }

                .modal-overlay .confirm-dialog h3 {
                    margin: 0 0 16px 0;
                    font-size: 17px;
                    font-weight: 600;
                    background: transparent !important;
                    color: var(--text-primary) !important;
                    padding: 0;
                    display: block;
                    text-transform: none;
                }

                .modal-overlay .confirm-dialog p {
                    margin: 12px 0 24px 0;
                    font-size: 14px;
                    font-weight: 400;
                    line-height: 1.5;
                    color: var(--text-secondary);
                }

                .modal-overlay .confirm-dialog-buttons {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                }

                .modal-overlay .confirm-dialog-button {
                    padding: 8px 16px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    background: var(--bg-main) !important;
                    border: 1px solid var(--border) !important;
                    color: var(--text-primary) !important;
                    box-shadow: none !important;
                    transition: all 0.15s;
                    border-radius: var(--radius-sm);
                }
                .modal-overlay .confirm-dialog-button:hover {
                    background: var(--border-light) !important;
                }
                .modal-overlay .confirm-dialog-button:active {
                    transform: scale(0.98);
                    box-shadow: none !important;
                }

                .modal-overlay .confirm-dialog-button.primary {
                    background: var(--accent-color) !important;
                    color: #fff !important;
                    border: none !important;
                }
                .modal-overlay .confirm-dialog-button.primary:hover {
                    background: var(--accent-color-dark) !important;
                }

                /* Modern Theme Polishes for Confirm Dialog */
                .theme-mica .confirm-dialog,
                .theme-acrylic .confirm-dialog {
                    background: rgba(255, 255, 255, 0.8) !important;
                    backdrop-filter: blur(20px);
                    padding: 24px !important;
                    border-radius: 16px !important;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2) !important;
                    border: 1px solid rgba(255,255,255,0.4) !important;
                    animation: modal-pop-modern 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
                }
                
                @keyframes modal-pop-modern {
                    0% { transform: scale(0.95); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }

                .theme-mica .confirm-dialog h3,
                .theme-acrylic .confirm-dialog h3 {
                    background: transparent !important;
                    color: var(--text-primary) !important;
                    font-size: 18px !important;
                    font-weight: 700 !important;
                    text-transform: none !important;
                    padding: 0 !important;
                }

                .theme-mica .confirm-dialog-button,
                .theme-acrylic .confirm-dialog-button {
                    border-radius: 10px !important;
                    border: none !important;
                    box-shadow: none !important;
                    font-weight: 600 !important;
                    background: rgba(0,0,0,0.05) !important;
                }
                .theme-mica .confirm-dialog-button:active,
                .theme-acrylic .confirm-dialog-button:active {
                    transform: scale(0.95);
                }

                .theme-mica .confirm-dialog-button.primary,
                .theme-acrylic .confirm-dialog-button.primary {
                    background: var(--accent-color) !important;
                }

                /* Dark Mode Adaptation */
                .dark-mode .modal-overlay .confirm-dialog {
                    background: #1f1f1f !important;
                    border-color: #000 !important;
                }
                .dark-mode .modal-overlay .confirm-dialog h3 {
                    color: #fff !important;
                }
                .dark-mode .modal-overlay .confirm-dialog p {
                    color: #d1d1d1 !important;
                }
                .dark-mode .theme-mica .confirm-dialog,
                .dark-mode .theme-acrylic .confirm-dialog {
                    background: rgba(30,30,30,0.8) !important;
                    border-color: rgba(255,255,255,0.1) !important;
                }

                .modal-input-field input {
                    width: 100%; 
                    background: var(--bg-main);
                    border: 1px solid var(--border);
                    padding: 12px; 
                    color: var(--text-primary);
                    font-family: inherit; 
                    font-size: 14px; 
                    font-weight: 400;
                    outline: none; 
                    margin-bottom: 20px;
                    border-radius: var(--radius-sm);
                    transition: all 0.2s;
                }
                .modal-input-field input:focus {
                    border-color: var(--accent-color);
                    box-shadow: 0 0 0 3px var(--accent-light);
                }
                .modal-buttons { display: flex; gap: 8px; justify-content: flex-end; }
                .modal-buttons button {
                    padding: 8px 16px; 
                    cursor: pointer;
                    font-size: 13px; 
                    font-weight: 500;
                    border: 1px solid var(--border);
                    background: var(--bg-main);
                    color: var(--text-primary);
                    box-shadow: none;
                    transition: all 0.15s;
                    border-radius: var(--radius-sm);
                }
                .modal-buttons button:active { transform: scale(0.98); }
                .btn-save { background: var(--accent-color); color: white; border: none; }
                .btn-save:hover { background: var(--accent-color-dark); }
                
                /* Modern Theme Polishes */
                .theme-mica.themed-tag-manager,
                .theme-acrylic.themed-tag-manager {
                    gap: 14px;
                    padding: 14px;
                    background: transparent !important;
                    overflow: hidden;
                }

                .theme-mica .tag-sidebar,
                .theme-acrylic .tag-sidebar {
                    width: clamp(196px, 24%, 248px);
                    border: var(--panel-border);
                    border-radius: 24px;
                    background: var(--bg-panel);
                    box-shadow: var(--panel-shadow);
                    overflow: hidden;
                }

                .theme-mica.sidebar-collapsed .tag-sidebar,
                .theme-acrylic.sidebar-collapsed .tag-sidebar {
                    width: 64px;
                }

                .theme-mica .sidebar-header,
                .theme-acrylic .sidebar-header {
                    min-height: 88px;
                    padding: 24px 24px 18px;
                    background: transparent;
                    border-bottom: 1px solid var(--panel-divider-color);
                }

                .theme-mica .header-label,
                .theme-acrylic .header-label {
                    font-size: 18px;
                    font-weight: 700;
                    letter-spacing: 0;
                }

                .theme-mica .collapse-toggle,
                .theme-acrylic .collapse-toggle {
                    width: 40px;
                    height: 40px;
                    border: 1px solid rgba(var(--accent-color-rgb), 0.12);
                    border-radius: 14px;
                    background: var(--bg-input);
                    color: var(--text-secondary);
                    box-shadow: none;
                }

                .theme-mica .collapse-toggle:hover,
                .theme-acrylic .collapse-toggle:hover {
                    background: rgba(var(--accent-color-rgb), 0.08);
                    color: var(--text-primary);
                }

                .theme-mica .tag-search-box,
                .theme-acrylic .tag-search-box {
                    margin: 18px 16px;
                    min-height: 56px;
                    padding: 0 16px;
                    gap: 12px;
                    border: var(--input-border);
                    border-radius: 16px;
                    background: var(--bg-input);
                    box-shadow: var(--input-shadow);
                }

                .theme-mica .tag-search-box .search-icon-placeholder,
                .theme-acrylic .tag-search-box .search-icon-placeholder {
                    opacity: 0.78;
                    color: var(--text-secondary);
                }

                .theme-mica .tag-search-box input,
                .theme-acrylic .tag-search-box input {
                    padding: 0;
                    font-size: 15px;
                    font-weight: 600;
                }

                .theme-mica .tag-search-box input::placeholder,
                .theme-acrylic .tag-search-box input::placeholder {
                    font-size: 15px;
                    font-style: normal;
                    opacity: 0.72;
                }

                .theme-mica .action-icons,
                .theme-acrylic .action-icons {
                    gap: 8px;
                }

                .theme-mica .action-icon,
                .theme-acrylic .action-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    height: 28px;
                    border-radius: 999px;
                    background: rgba(var(--accent-color-rgb), 0.08);
                    color: var(--text-secondary);
                    opacity: 1;
                }

                .theme-mica .action-icon:hover,
                .theme-acrylic .action-icon:hover {
                    background: rgba(var(--accent-color-rgb), 0.14);
                    color: var(--accent-color);
                    transform: none;
                }

                .theme-mica .tag-scroll,
                .theme-acrylic .tag-scroll {
                    padding: 4px 12px 16px;
                }

                .theme-mica .tag-item,
                .theme-acrylic .tag-item {
                    min-height: 60px;
                    padding: 14px 16px;
                    margin-bottom: 6px;
                    border: 1px solid transparent;
                    border-radius: 16px;
                    background: transparent;
                }

                .theme-mica .tag-item:hover,
                .theme-acrylic .tag-item:hover {
                    background: rgba(var(--accent-color-rgb), 0.06);
                    border-color: rgba(var(--accent-color-rgb), 0.12);
                }

                .theme-mica .tag-item.active,
                .theme-acrylic .tag-item.active {
                    background: rgba(var(--accent-color-rgb), 0.12);
                    border-color: rgba(var(--accent-color-rgb), 0.16);
                    box-shadow: none;
                }

                .theme-mica .tag-color-dot,
                .theme-acrylic .tag-color-dot {
                    width: 14px;
                    height: 14px;
                    border: none;
                    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
                }

                .theme-mica .tag-name,
                .theme-acrylic .tag-name {
                    font-size: 15px;
                    font-weight: 700;
                }

                .theme-mica .tag-hover-actions,
                .theme-acrylic .tag-hover-actions {
                    gap: 6px;
                    color: var(--text-secondary);
                }

                .theme-mica .tag-hover-actions > span,
                .theme-acrylic .tag-hover-actions > span {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                    border-radius: 999px;
                }

                .theme-mica .tag-hover-actions > span:hover,
                .theme-acrylic .tag-hover-actions > span:hover {
                    background: rgba(var(--accent-color-rgb), 0.12);
                    color: var(--accent-color);
                }

                .theme-mica .tag-item.active .tag-hover-actions > span:hover,
                .theme-acrylic .tag-item.active .tag-hover-actions > span:hover {
                    background: rgba(var(--accent-color-rgb), 0.14);
                    color: var(--accent-color);
                }

                .theme-mica .tag-badge,
                .theme-acrylic .tag-badge {
                    margin-left: auto;
                    min-width: 34px;
                    height: 30px;
                    padding: 0 10px;
                    border-radius: 999px;
                    background: rgba(127, 140, 160, 0.1);
                    color: var(--text-secondary);
                    font-size: 14px;
                    font-weight: 700;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 1;
                }

                .theme-mica .tag-item.active .tag-badge,
                .theme-acrylic .tag-item.active .tag-badge {
                    background: var(--accent-color);
                    color: #ffffff;
                }

                .theme-mica .tag-content,
                .theme-acrylic .tag-content {
                    min-width: 0;
                    border: var(--panel-border);
                    border-radius: 28px;
                    background: var(--bg-panel);
                    box-shadow: var(--panel-shadow);
                }

                .theme-mica .content-toolbar,
                .theme-acrylic .content-toolbar {
                    min-height: 88px;
                    padding: 20px 28px;
                    border-bottom: 1px solid var(--panel-divider-color);
                    background: transparent;
                }

                .theme-mica .toolbar-left,
                .theme-mica .toolbar-right,
                .theme-acrylic .toolbar-left,
                .theme-acrylic .toolbar-right {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }

                .theme-mica .toolbar-right,
                .theme-acrylic .toolbar-right {
                    margin-left: auto;
                }

                .theme-mica .toolbar-divider,
                .theme-acrylic .toolbar-divider {
                    width: 1px;
                    height: 28px;
                    background: var(--panel-divider-color);
                }

                .theme-mica .selected-tag-indicator,
                .theme-acrylic .selected-tag-indicator {
                    padding: 8px 16px;
                    border-radius: var(--radius-pill);
                    background: rgba(var(--accent-color-rgb), 0.12);
                    border: 1px solid rgba(var(--accent-color-rgb), 0.16);
                    color: var(--accent-color);
                    font-size: 14px;
                    font-weight: 600;
                    gap: 10px;
                    opacity: 1;
                }

                .theme-mica .breadcrumb-text,
                .theme-acrylic .breadcrumb-text {
                    color: var(--text-primary);
                }

                .theme-mica .sort-group,
                .theme-acrylic .sort-group {
                    gap: 10px;
                    padding-left: 0;
                    border-left: none;
                }

                .theme-mica .sort-btn,
                .theme-acrylic .sort-btn {
                    min-height: 40px;
                    padding: 0 16px;
                    border: 1px solid rgba(var(--accent-color-rgb), 0.14);
                    border-radius: 14px;
                    background: transparent;
                    color: var(--text-secondary);
                    box-shadow: none;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .theme-mica .sort-btn span,
                .theme-acrylic .sort-btn span {
                    font-size: 13px;
                    font-weight: 500;
                }

                .theme-mica .sort-btn:hover,
                .theme-acrylic .sort-btn:hover {
                    background: rgba(var(--accent-color-rgb), 0.08);
                    color: var(--text-primary);
                }

                .theme-mica .sort-btn.active,
                .theme-acrylic .sort-btn.active {
                    background: var(--accent-color);
                    border-color: var(--accent-color);
                    color: #ffffff;
                    box-shadow: 0 12px 24px rgba(var(--accent-color-rgb), 0.24);
                }

                .theme-mica .add-item-btn,
                .theme-acrylic .add-item-btn {
                    width: auto !important;
                    min-height: 40px;
                    padding: 0 18px;
                    border: none;
                    border-radius: 14px;
                    background: var(--accent-color);
                    color: #ffffff;
                    box-shadow: 0 12px 24px rgba(var(--accent-color-rgb), 0.26);
                    gap: 8px;
                    font-size: 14px;
                    font-weight: 600;
                }

                .theme-mica .add-item-btn span,
                .theme-acrylic .add-item-btn span {
                    display: inline-block;
                }

                .theme-mica .add-item-btn:hover,
                .theme-acrylic .add-item-btn:hover {
                    background: var(--accent-hover);
                    color: #ffffff;
                }

                .theme-mica .view-toggle,
                .theme-acrylic .view-toggle {
                    padding: 4px;
                    gap: 4px;
                    border: 1px solid rgba(var(--accent-color-rgb), 0.12);
                    border-radius: 18px;
                    background: var(--bg-input);
                }

                .theme-mica .toggle-btn,
                .theme-acrylic .toggle-btn {
                    width: 44px;
                    height: 44px;
                    padding: 0;
                    border: none;
                    border-radius: 14px;
                    background: transparent;
                    color: var(--text-secondary);
                    box-shadow: none;
                }

                .theme-mica .toggle-btn:hover,
                .theme-acrylic .toggle-btn:hover {
                    background: rgba(var(--accent-color-rgb), 0.08);
                    color: var(--text-primary);
                }

                .theme-mica .toggle-btn.active,
                .theme-acrylic .toggle-btn.active {
                    background: var(--accent-color);
                    color: #ffffff;
                    box-shadow: 0 10px 20px rgba(var(--accent-color-rgb), 0.2);
                }

                .theme-mica .items-area,
                .theme-acrylic .items-area {
                    padding: 28px;
                    background: transparent;
                }

                .theme-mica .status-msg,
                .theme-acrylic .status-msg {
                    padding: 36px 12px;
                    text-align: center;
                    color: var(--text-secondary);
                    font-size: 14px;
                }

                .theme-mica .items-grid,
                .theme-acrylic .items-grid {
                    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                    gap: 22px;
                }

                .theme-mica .items-list,
                .theme-acrylic .items-list {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 18px;
                }

                .theme-mica .themed-card,
                .theme-acrylic .themed-card {
                    position: relative;
                    min-height: 244px;
                    padding: 24px 22px 18px;
                    border: 1px solid rgba(var(--accent-color-rgb), 0.08);
                    border-radius: 22px;
                    background: var(--bg-input);
                    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
                    display: flex;
                    flex-direction: column;
                    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
                }

                .theme-mica .themed-card:hover,
                .theme-acrylic .themed-card:hover {
                    transform: translateY(-2px);
                    border-color: rgba(var(--accent-color-rgb), 0.14);
                    box-shadow: 0 18px 34px rgba(15, 23, 42, 0.1);
                    background: var(--bg-input);
                }

                .theme-mica .items-list .themed-card,
                .theme-acrylic .items-list .themed-card {
                    min-height: 180px;
                }

                .theme-mica .card-top-row,
                .theme-acrylic .card-top-row {
                    position: absolute;
                    top: 14px;
                    right: 14px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    opacity: 0;
                    transition: opacity 0.18s ease;
                    z-index: 1;
                }

                .theme-mica .themed-card:hover .card-top-row,
                .theme-acrylic .themed-card:hover .card-top-row {
                    opacity: 1;
                }

                .theme-mica .card-actions-left,
                .theme-acrylic .card-actions-left {
                    gap: 6px;
                }

                .theme-mica .card-action-btn,
                .theme-mica .del-btn,
                .theme-acrylic .card-action-btn,
                .theme-acrylic .del-btn {
                    width: 28px;
                    height: 28px;
                    padding: 0;
                    border: 1px solid rgba(var(--accent-color-rgb), 0.08);
                    border-radius: 999px;
                    background: rgba(255, 255, 255, 0.88);
                    color: var(--text-secondary);
                    box-shadow: none;
                    opacity: 1;
                }

                .theme-mica .card-action-btn:hover,
                .theme-mica .del-btn:hover,
                .theme-acrylic .card-action-btn:hover,
                .theme-acrylic .del-btn:hover {
                    background: rgba(var(--accent-color-rgb), 0.12);
                    color: var(--accent-color);
                }

                .theme-mica .card-body-text,
                .theme-acrylic .card-body-text {
                    flex: 1;
                    padding-top: 12px;
                    font-size: 15px;
                    line-height: 1.7;
                    font-weight: 500;
                    color: var(--text-primary);
                    -webkit-line-clamp: 5;
                    min-height: 122px;
                }

                .theme-mica .items-list .card-body-text,
                .theme-acrylic .items-list .card-body-text {
                    -webkit-line-clamp: 3;
                    min-height: 84px;
                }

                .theme-mica .card-media,
                .theme-acrylic .card-media {
                    flex: 1;
                    min-height: 190px;
                    margin-top: 14px;
                    border: none;
                    border-radius: 18px;
                    background: rgba(127, 140, 160, 0.12);
                    align-items: center;
                }

                .theme-mica .card-media img,
                .theme-acrylic .card-media img {
                    max-width: 100%;
                    max-height: 190px;
                    object-fit: contain;
                    border-radius: 14px;
                }

                .theme-mica .card-divider,
                .theme-acrylic .card-divider {
                    height: 1px;
                    margin: 18px 0 14px;
                    background: var(--panel-divider-color);
                }

                .theme-mica .card-footer,
                .theme-acrylic .card-footer {
                    margin-top: auto;
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    opacity: 1;
                }

                .theme-mica .meta-usage,
                .theme-acrylic .meta-usage {
                    gap: 4px;
                }

                .theme-mica .inline-tag-edit,
                .theme-acrylic .inline-tag-edit,
                .theme-mica .modal-input-field input,
                .theme-acrylic .modal-input-field input {
                    border: var(--input-border);
                    border-radius: var(--input-radius);
                    box-shadow: var(--input-shadow);
                    padding: 8px 10px;
                    outline: none;
                }

                .theme-mica .modal-input-field textarea,
                .theme-acrylic .modal-input-field textarea {
                    background: var(--bg-input) !important;
                    border: var(--input-border) !important;
                    border-radius: 16px !important;
                    box-shadow: var(--input-shadow) !important;
                    color: var(--text-primary) !important;
                }

                .theme-mica .modal-buttons button,
                .theme-acrylic .modal-buttons button {
                    border: var(--button-border);
                    border-radius: var(--button-radius);
                    box-shadow: var(--button-shadow);
                }

                .dark-mode .theme-mica .tag-search-box,
                .dark-mode .theme-acrylic .tag-search-box,
                .dark-mode .theme-mica .tag-sidebar,
                .dark-mode .theme-acrylic .tag-sidebar,
                .dark-mode .theme-mica .tag-content,
                .dark-mode .theme-acrylic .tag-content {
                    border-color: rgba(255, 255, 255, 0.08);
                }

                .dark-mode .theme-mica .card-action-btn,
                .dark-mode .theme-mica .del-btn,
                .dark-mode .theme-acrylic .card-action-btn,
                .dark-mode .theme-acrylic .del-btn {
                    background: rgba(22, 28, 39, 0.92);
                    border-color: rgba(255, 255, 255, 0.08);
                }

                .dark-mode .theme-mica .tag-badge,
                .dark-mode .theme-acrylic .tag-badge {
                    background: rgba(255, 255, 255, 0.08);
                }
                
                .custom-scrollbar::-webkit-scrollbar { width: var(--scrollbar-size-thin); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb-color); border-radius: var(--scrollbar-radius); }

                @media (max-width: 320px) {
                    .themed-tag-manager {
                        flex-direction: column;
                        padding: 8px;
                        gap: 12px;
                        overflow-y: auto;
                    }
                    .tag-sidebar {
                        width: 100% !important;
                        height: 240px;
                        flex-shrink: 0;
                    }
                    .tag-content {
                        min-height: 300px;
                    }
                }

                .tag-divider {
                    width: 4px;
                    height: 100%;
                    cursor: col-resize;
                    margin: 0;
                    background: transparent;
                    transition: background 0.2s;
                    position: relative;
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .tag-divider:hover, .tag-divider.active {
                    background: rgba(var(--accent-color-rgb), 0.1);
                }
                .tag-divider-handle {
                    width: 1px;
                    height: 32px;
                    background: var(--accent-color);
                    opacity: 0.22;
                    border-radius: 2px;
                    transition: opacity 0.2s, height 0.2s;
                }
                .tag-divider:hover .tag-divider-handle, .tag-divider.active .tag-divider-handle {
                    opacity: 0.6;
                    height: 48px;
                }

                /* Multi-selection Management Styles */
                .toolbar-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .manage-btn {
                    margin-left: 12px !important;
                }
                @media (max-width: 500px) {
                    .manage-btn span {
                        display: none;
                    }
                }


                .sort-btn.danger {
                    color: #ff4d4f !important;
                }
                .sort-btn.danger:hover:not(:disabled) {
                    background: rgba(255, 77, 79, 0.1) !important;
                }
                .sort-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }
                
                .theme-mica .sort-btn.danger:hover:not(:disabled),
                .theme-acrylic .sort-btn.danger:hover:not(:disabled) {
                    background: rgba(255, 77, 79, 0.15);
                }

                .selection-indicator {
                    width: 20px;
                    height: 20px;
                    border: 2px solid var(--border);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    background: var(--bg-main);
                }
                .selection-indicator.checked {
                    background: var(--accent-color);
                    border-color: var(--accent-color);
                }
                .inner-check {
                    width: 7px;
                    height: 4px;
                    border-left: 2px solid white;
                    border-bottom: 2px solid white;
                    transform: rotate(-45deg);
                    opacity: 0;
                    transition: opacity 0.2s;
                    margin-top: -2px;
                }
                .selection-indicator.checked .inner-check {
                    opacity: 1;
                }

                .manage-mode .themed-card {
                    border-color: var(--border);
                }
                .manage-mode .themed-card:hover {
                    border-color: var(--accent-light);
                    transform: none;
                    box-shadow: none;
                }
                .manage-mode .themed-card.selected {
                    background: rgba(var(--accent-color-rgb), 0.05);
                    border-color: var(--accent-color);
                    box-shadow: 0 0 0 1px var(--accent-color);
                }

                /* Ensure card top row shows up in manage mode to hold selection indicator */
                .manage-mode .themed-card .card-top-row {
                    opacity: 1 !important;
                }
                .manage-mode .card-actions-left {
                    display: flex !important;
                }
                .manage-mode .card-top-row {
                    right: auto !important;
                    left: 14px !important;
                }

                /* Premium adjustments for modern themes */
                .theme-mica .manage-btn, .theme-acrylic .manage-btn {
                    min-height: 40px;
                    border-radius: 14px;
                    padding: 0 16px;
                    background: var(--bg-input) !important;
                    margin-left: 0;
                }

                .theme-mica .action-btn-primary, .theme-acrylic .action-btn-primary,
                .theme-mica .action-btn-danger, .theme-acrylic .action-btn-danger,
                .theme-mica .action-btn-secondary, .theme-acrylic .action-btn-secondary {
                    min-height: 40px;
                    border-radius: 14px;
                }

                .theme-mica .selection-indicator, .theme-acrylic .selection-indicator {
                    border-radius: 8px;
                    border-color: rgba(var(--accent-color-rgb), 0.2);
                }
                
                .theme-mica .manage-mode .themed-card.selected,
                .theme-acrylic .manage-mode .themed-card.selected {
                    background: rgba(var(--accent-color-rgb), 0.08);
                    box-shadow: 0 12px 28px rgba(var(--accent-color-rgb), 0.15);
                }

                .fab-add-btn {
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: var(--accent-color);
                    color: white;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(var(--accent-color-rgb), 0.3);
                    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                    z-index: 100;
                    opacity: 0.85;
                }
                .fab-add-btn:hover {
                    background: var(--accent-hover);
                    transform: scale(1.08) translateY(-2px);
                    box-shadow: 0 12px 24px rgba(var(--accent-color-rgb), 0.4);
                    opacity: 1;
                }
                .fab-add-btn:active {
                    transform: scale(0.95);
                }
                
                .theme-mica .fab-add-btn, .theme-acrylic .fab-add-btn {
                    width: 48px;
                    height: 48px;
                    background: var(--accent-color);
                    box-shadow: 0 10px 24px rgba(var(--accent-color-rgb), 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.25);
                }
                
                /* Ensure tag-content is the anchor for FAB */
                .tag-content { 
                    position: relative; 
                }

            `}</style>
        </div >
    );
}
