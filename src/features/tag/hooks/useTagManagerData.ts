import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { isSensitiveTag } from "../../../shared/lib/sensitiveTags";
import {
    copyToClipboard,
    deleteClipboardEntry
} from "../../../shared/ipc/commands";
import { TAURI_EVENTS } from "../../../shared/ipc/contracts";
import type { ClipboardEntry } from "../../../shared/types";

export interface TagInfo {
    name: string;
    count: number;
}

export const useTagManagerData = () => {
    const [tags, setTags] = useState<TagInfo[]>([]);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [tagItems, setTagItems] = useState<ClipboardEntry[]>([]);
    const [tagColors, setTagColors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const selectedTagRef = useRef<string | null>(null);

    useEffect(() => {
        selectedTagRef.current = selectedTag;
    }, [selectedTag]);

    const loadTagItems = async (tagName: string) => {
        setLoading(true);
        setSelectedTag(tagName);
        try {
            const items = await invoke<ClipboardEntry[]>('get_tag_items', { tag: tagName });
            setTagItems(items || []);
        } catch (err) {
            console.error(err);
            setTagItems([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTags = async () => {
        try {
            const [tagMap, colors] = await Promise.all([
                invoke<Record<string, number>>('get_all_tags_info'),
                invoke<Record<string, string>>('get_tag_colors')
            ]);
            const tagArray = Object.entries(tagMap).map(([name, count]) => ({ name, count }));
            tagArray.sort((a, b) => b.count - a.count);
            setTags(tagArray);
            setTagColors(colors || {});

            const activeTag = selectedTagRef.current;
            if (tagArray.length === 0) {
                setSelectedTag(null);
                setTagItems([]);
            } else if (!activeTag || !tagArray.some((tag) => tag.name === activeTag)) {
                await loadTagItems(tagArray[0].name);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        let unlisteners: (() => void)[] = [];
        const setupListeners = async () => {
            const handleUpdate = () => {
                if (isDeleting) return;
                fetchTags();
                if (selectedTagRef.current) loadTagItems(selectedTagRef.current);
            };
            unlisteners.push(await listen(TAURI_EVENTS.clipboardChanged, handleUpdate));
            unlisteners.push(await listen(TAURI_EVENTS.clipboardUpdated, handleUpdate));
            unlisteners.push(await listen(TAURI_EVENTS.clipboardRemoved, handleUpdate));
        };
        setupListeners();
        return () => unlisteners.forEach((unlisten) => unlisten());
    }, [isDeleting]);

    useEffect(() => {
        fetchTags();
    }, []);

    const createTag = async (rawName: string) => {
        const name = rawName.trim();
        if (!name) return null;
        try {
            await invoke('create_new_tag', { tagName: name });
            await fetchTags();
            await loadTagItems(name);
            return name;
        } catch (err) {
            console.error(err);
            return null;
        }
    };

    const renameTag = async (oldName: string, rawName: string) => {
        const name = rawName.trim();
        if (!name || name === oldName || isSensitiveTag(oldName)) return false;
        try {
            await invoke('rename_tag_globally', { oldName, newName: name });
            await fetchTags();
            await loadTagItems(name);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const deleteTag = async (tagName: string) => {
        if (isSensitiveTag(tagName)) return;
        setIsDeleting(true);
        try {
            await invoke('delete_tag_from_all', { tagName });
            await emit(TAURI_EVENTS.clipboardChanged);
            await fetchTags();
        } catch (err) {
            console.error(err);
        } finally {
            setIsDeleting(false);
        }
    };

    const setTagColor = async (name: string, color: string) => {
        setTagColors((previous) => ({ ...previous, [name]: color }));
        await invoke('set_tag_color', { name, color });
        await emit(TAURI_EVENTS.tagColorsUpdated);
    };

    const addManualItem = async (content: string) => {
        if (!content.trim() || !selectedTag) return false;
        try {
            await invoke('add_manual_item', { content, contentType: 'text', tags: [selectedTag] });
            await loadTagItems(selectedTag);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const updateItemContent = async (id: number, content: string) => {
        if (!content.trim()) return false;
        try {
            await invoke('update_item_content', { id, newContent: content });
            if (selectedTag) await loadTagItems(selectedTag);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const copyItem = async (id: number, content: string, contentType: string) => {
        try {
            await copyToClipboard({ content, contentType, paste: true, id, deleteAfterUse: false });
        } catch (err) {
            console.error(err);
        }
    };

    const deleteItems = async (ids: number[]) => {
        for (const id of ids) await deleteClipboardEntry(id);
        if (selectedTag) await loadTagItems(selectedTag);
        await emit(TAURI_EVENTS.clipboardChanged);
    };

    return {
        tags,
        selectedTag,
        tagItems,
        tagColors,
        loading,
        loadTagItems,
        createTag,
        renameTag,
        deleteTag,
        setTagColor,
        addManualItem,
        updateItemContent,
        copyItem,
        deleteItems
    };
};
