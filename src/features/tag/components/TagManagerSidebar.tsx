import { Edit2, Plus, Search, Trash2, X } from "lucide-react";
import { activateWindowFocus } from "../../../shared/ipc/commands";
import { isSensitiveTag } from "../../../shared/lib/sensitiveTags";
import { getTagColor } from "../../../shared/lib/utils";
import type { TagInfo } from "../hooks/useTagManagerData";

interface TagManagerSidebarProps {
    t: (key: string) => string;
    theme: string;
    tags: TagInfo[];
    filteredTags: TagInfo[];
    tagColors: Record<string, string>;
    selectedTag: string | null;
    tagSearch: string;
    normalizedTagSearch: string;
    canCreateTag: boolean;
    editingTag: string | null;
    newTagName: string;
    setTagSearch: (value: string) => void;
    setEditingTag: (value: string | null) => void;
    setNewTagName: (value: string) => void;
    setDeleteTagName: (value: string) => void;
    openColorPicker: (name: string, color: string) => void;
    createTag: (name: string) => Promise<void>;
    renameTag: (oldName: string) => Promise<void>;
    openTag: (tagName: string) => Promise<void>;
}

const TagManagerSidebar = ({
    t,
    theme,
    tags,
    filteredTags,
    tagColors,
    selectedTag,
    tagSearch,
    normalizedTagSearch,
    canCreateTag,
    editingTag,
    newTagName,
    setTagSearch,
    setEditingTag,
    setNewTagName,
    setDeleteTagName,
    openColorPicker,
    createTag,
    renameTag,
    openTag
}: TagManagerSidebarProps) => (
    <div className="tag-manager__list-page">
        <div className="tag-manager__list-header">
            <span className="tag-manager__list-title">{t('tags')}</span>
        </div>

        <div className="tag-manager__search">
                <Search size={16} className="tag-manager__search-icon" />
                <input
                    placeholder={t('find_or_create')}
                    value={tagSearch}
                    onMouseDown={() => activateWindowFocus().catch(console.error)}
                    onFocus={() => activateWindowFocus().catch(console.error)}
                    onChange={(event) => setTagSearch(event.target.value)}
                    onKeyDown={async (event) => {
                        if (event.key !== 'Enter' || !tagSearch.trim()) return;
                        const exactMatch = tags.find((tag) => tag.name.toLowerCase() === normalizedTagSearch);
                        if (exactMatch) await openTag(exactMatch.name);
                        else await createTag(tagSearch);
                    }}
                />
                {tagSearch ? (
                    <div className="tag-manager__search-actions">
                        {canCreateTag && (
                            <span title={t('create_new_tag_tooltip')} className="tag-manager__search-action tag-manager__search-action--create" onClick={() => createTag(tagSearch)}>
                                <Plus size={12} />
                            </span>
                        )}
                        <X size={12} className="tag-manager__search-action tag-manager__search-action--clear" onClick={() => setTagSearch('')} />
                    </div>
                ) : null}
        </div>

        <div className="tag-manager__tag-list ui-scroll">
            {filteredTags.map((tag) => (
                <div key={tag.name} className={`tag-manager__tag ${selectedTag === tag.name ? 'tag-manager__tag--active' : ''}`} onClick={() => openTag(tag.name)} title={tag.name}>
                    <div className="tag-manager__color-control" onClick={(event) => event.stopPropagation()}>
                        <div
                            className="tag-manager__color"
                            style={{ background: tagColors[tag.name] || getTagColor(tag.name, theme) }}
                            onClick={() => openColorPicker(tag.name, tagColors[tag.name] || getTagColor(tag.name, theme))}
                            title={t('choose_color')}
                        />
                    </div>
                    {editingTag === tag.name ? (
                        <input
                            className="tag-manager__tag-input"
                            value={newTagName}
                            onMouseDown={() => activateWindowFocus().catch(console.error)}
                            onFocus={() => activateWindowFocus().catch(console.error)}
                            onChange={(event) => setNewTagName(event.target.value)}
                            autoFocus
                            onKeyDown={async (event) => {
                                if (event.key === 'Enter') await renameTag(tag.name);
                                else if (event.key === 'Escape') setEditingTag(null);
                            }}
                            onBlur={() => setEditingTag(null)}
                            onClick={(event) => event.stopPropagation()}
                        />
                    ) : (
                        <>
                            <span className="tag-manager__tag-name">{tag.name}</span>
                            <div className="tag-manager__tag-actions">
                                {!isSensitiveTag(tag.name) && (
                                    <span
                                        title="重命名"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setEditingTag(tag.name);
                                            setNewTagName(tag.name);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                                    >
                                        <Edit2 size={12} />
                                    </span>
                                )}
                                {!isSensitiveTag(tag.name) && (
                                    <span
                                        title="删除"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            event.preventDefault();
                                            setDeleteTagName(tag.name);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={12} />
                                    </span>
                                )}
                            </div>
                            <span className="tag-manager__tag-count">{tag.count}</span>
                        </>
                    )}
                </div>
            ))}
            {filteredTags.length === 0 && !tagSearch.trim() && <div className="tag-manager__status">{t('no_tags')}</div>}
            {canCreateTag && filteredTags.length === 0 && (
                <div className="tag-manager__tag tag-manager__tag--create-hint" onClick={() => createTag(tagSearch)}>
                    <div className="tag-manager__color" style={{ border: '1px dashed currentColor', background: 'transparent' }} />
                    <span className="tag-manager__tag-name" style={{ opacity: 0.7 }}>{t('create_tag_hint').replace('{tag}', tagSearch.trim())}</span>
                    <Plus size={10} />
                </div>
            )}
        </div>
    </div>
);

export default TagManagerSidebar;
