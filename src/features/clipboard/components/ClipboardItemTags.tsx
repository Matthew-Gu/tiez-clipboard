import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { activateWindowFocus } from "../../../shared/ipc/commands";
import { getTagColor, getTagTextColor } from "../../../shared/lib/utils";

interface ClipboardItemTagsProps {
    itemId: number;
    tags?: string[];
    isEditing: boolean;
    tagInput: string;
    tagSuggestions: string[];
    theme: string;
    tagColors?: Record<string, string>;
    t: (key: string) => string;
    onTagInput: (value: string) => void;
    onTagAdd: () => void;
    onTagPick?: (tag: string) => void;
    onTagEditCancel?: () => void;
    onTagDelete: (tag: string) => void;
}

const ClipboardItemTags = ({
    itemId,
    tags,
    isEditing,
    tagInput,
    tagSuggestions,
    theme,
    tagColors,
    t,
    onTagInput,
    onTagAdd,
    onTagPick,
    onTagEditCancel,
    onTagDelete
}: ClipboardItemTagsProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const isComposing = useRef(false);
    const suggestionListRef = useRef<HTMLDivElement | null>(null);
    const [localTagInput, setLocalTagInput] = useState(tagInput);
    const [suggestionIndex, setSuggestionIndex] = useState(-1);
    const pickableSuggestions = useMemo(() => {
        if (!isEditing) return [];
        const existing = new Set(tags || []);
        const query = localTagInput.trim().toLowerCase();
        return tagSuggestions
            .filter((tag) => !existing.has(tag))
            .filter((tag) => !query || tag.toLowerCase().includes(query))
            .slice(0, 14);
    }, [isEditing, localTagInput, tagSuggestions, tags]);

    useEffect(() => {
        setLocalTagInput(tagInput);
    }, [tagInput]);

    useEffect(() => {
        if (!isEditing) setSuggestionIndex(-1);
        if (isEditing) inputRef.current?.focus();
    }, [isEditing]);

    useEffect(() => {
        setSuggestionIndex((previous) => {
            if (pickableSuggestions.length === 0 || previous < 0) return -1;
            return Math.min(previous, pickableSuggestions.length - 1);
        });
    }, [pickableSuggestions]);

    useLayoutEffect(() => {
        if (suggestionIndex < 0 || !suggestionListRef.current) return;
        const row = suggestionListRef.current.children[suggestionIndex] as HTMLElement | undefined;
        row?.scrollIntoView({ block: "nearest" });
    }, [pickableSuggestions, suggestionIndex]);

    return (
        <div
            className={`item-tags-container${isEditing ? ' tag-edit-active' : ''}`}
            style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '4px', paddingTop: '0' }}
        >
            {tags?.map((tag) => {
                const background = tagColors?.[tag] || getTagColor(tag, theme);
                return (
                    <span
                        key={tag}
                        className="tag-chip"
                        style={{ background, color: getTagTextColor(background), display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        {tag}
                        {isEditing && (
                            <button
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onTagDelete(tag);
                                }}
                                style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', opacity: 0.72, cursor: 'pointer', display: 'flex' }}
                            >
                                <X size={8} />
                            </button>
                        )}
                    </span>
                );
            })}

            {isEditing && (
                <div className="tag-edit-anchor">
                    <div className="tag-edit-input-row">
                        <input
                            ref={inputRef}
                            type="text"
                            value={localTagInput}
                            onCompositionStart={() => { isComposing.current = true; }}
                            onCompositionEnd={(event) => {
                                isComposing.current = false;
                                const value = (event.target as HTMLInputElement).value;
                                setLocalTagInput(value);
                                onTagInput(value);
                            }}
                            onMouseDown={() => { activateWindowFocus().catch(console.error); }}
                            onFocus={() => { activateWindowFocus().catch(console.error); }}
                            onChange={(event) => {
                                const value = event.target.value;
                                setLocalTagInput(value);
                                if (!isComposing.current) onTagInput(value);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onTagEditCancel?.();
                                    return;
                                }
                                const suggestionCount = pickableSuggestions.length;
                                if (event.key === 'ArrowDown' && suggestionCount > 0 && onTagPick) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setSuggestionIndex((previous) => previous < 0 ? 0 : Math.min(previous + 1, suggestionCount - 1));
                                    return;
                                }
                                if (event.key === 'ArrowUp' && suggestionCount > 0 && onTagPick) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setSuggestionIndex((previous) => previous <= 0 ? -1 : previous - 1);
                                    return;
                                }
                                if (event.key === 'Enter' && !isComposing.current) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    if (onTagPick && suggestionIndex >= 0 && suggestionIndex < suggestionCount) {
                                        onTagPick(pickableSuggestions[suggestionIndex]);
                                        setLocalTagInput('');
                                        setSuggestionIndex(-1);
                                    } else {
                                        onTagAdd();
                                    }
                                }
                            }}
                            className="tag-input"
                            aria-autocomplete="list"
                            aria-controls={pickableSuggestions.length > 0 && onTagPick ? `tag-suggest-list-${itemId}` : undefined}
                            aria-activedescendant={suggestionIndex >= 0 && pickableSuggestions.length > 0 && onTagPick ? `tag-suggest-opt-${itemId}-${suggestionIndex}` : undefined}
                            placeholder={t('enter_tag_name')}
                            style={{ background: 'var(--bg-input)', border: 'none', borderRadius: '0', padding: '2px 6px', fontSize: '10px', color: 'var(--text-primary)', outline: 'none' }}
                            onClick={(event) => event.stopPropagation()}
                        />
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onTagAdd();
                            }}
                            className="btn-icon"
                            style={{ padding: '2px', height: '16px', width: '16px' }}
                        >
                            <Plus size={10} />
                        </button>
                    </div>
                    {pickableSuggestions.length > 0 && onTagPick && (
                        <div
                            ref={suggestionListRef}
                            id={`tag-suggest-list-${itemId}`}
                            className="tag-edit-suggestions-popover hide-scrollbar"
                            role="listbox"
                            aria-label={t('find_tags')}
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            {pickableSuggestions.map((tag, index) => {
                                const background = tagColors?.[tag] || getTagColor(tag, theme);
                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        role="option"
                                        id={`tag-suggest-opt-${itemId}-${index}`}
                                        aria-selected={suggestionIndex === index}
                                        className={`tag-suggest-item${suggestionIndex === index ? ' tag-suggest-item--active' : ''}`}
                                        onMouseEnter={() => setSuggestionIndex(index)}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onTagPick(tag);
                                            setLocalTagInput('');
                                            setSuggestionIndex(-1);
                                        }}
                                    >
                                        <span className="tag-suggest-pill" style={{ background, color: getTagTextColor(background) }}>{tag}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ClipboardItemTags;
