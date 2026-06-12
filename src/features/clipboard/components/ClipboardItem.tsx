import { useRef, useEffect, useState, useMemo, memo } from "react";
import { motion } from "framer-motion";
import type { ClipboardItemProps } from "../types";
import { formatSensitivePreview } from "../../../shared/lib/utils";
import { getRichTextSnapshotDataUrl } from "../../../shared/lib/richTextSnapshot";
import { getFileIcon as getSystemFileIcon, peekFileIcon } from "../../../shared/lib/fileIcon";
import { getSourceAppIcon, peekSourceAppIcon } from "../../../shared/lib/sourceAppIcon";
import {
    extractRichImageFallback,
    getStandaloneColorValue,
    isAnimatedGifSrc,
    isSpreadsheetLikeSource,
    resolveRichImageSrc,
    richHtmlLooksTabular
} from "../lib/clipboardDisplay";
import ClipboardItemContent from "./ClipboardItemContent";
import ClipboardItemMeta from "./ClipboardItemMeta";
import ClipboardItemTags from "./ClipboardItemTags";

const richPreviewFailureLog = (stage: string, detail?: Record<string, unknown>) => {
    console.warn("[RichTextPreview][MainList]", stage, detail || {});
};

const ClipboardItem = ({
    item,
    isSelected,
    isSensitiveHidden,
    isRevealed,
    isEditingTags,
    tagInput,
    tagSuggestions = [],
    theme,
    language,
    t,
    onSelect,
    onNeedDetail,
    onCopy,
    onToggleReveal,
    onOpen,
    onTogglePin,
    onDelete,
    onToggleTagEditor,
    onTagInput,
    onTagAdd,
    onTagPick,
    onTagEditCancel,
    onTagDelete,
    tagColors,
    richTextSnapshotPreview = false,
    showSourceAppIcon = true,
    sensitiveMaskPrefixVisible = 3,
    sensitiveMaskSuffixVisible = 3,
    sensitiveMaskEmailDomain = false,
    quickPasteHint,
    dragControls,
    id,
    className,
    disableLayout
}: ClipboardItemProps & { className?: string }) => {
    const itemRef = useRef<HTMLDivElement | null>(null);
    const [snapshotFailed, setSnapshotFailed] = useState(false);
    const [richImageFallbackFailed, setRichImageFallbackFailed] = useState(false);
    const [sourceAppIcon, setSourceAppIcon] = useState<string | null>(() => peekSourceAppIcon(item.source_app_path) ?? null);
    const filePaths = useMemo(
        () => item.content_type === "file" ? item.content.split('\n').filter((p) => p.trim()) : [],
        [item.content, item.content_type]
    );
    const singleFilePath = filePaths.length === 1 ? filePaths[0] : null;
    const [fileIcon, setFileIcon] = useState<string | null>(() => peekFileIcon(singleFilePath) ?? null);
    const richSnapshotImgRef = useRef<HTMLImageElement | null>(null);
    const richSnapshotFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const richTextFallback = item.content_type === "rich_text" && item.html_content
        ? (() => {
            const { cleanHtml, imagePayload } = extractRichImageFallback(item.html_content);
            return {
                cleanHtml: cleanHtml || item.html_content,
                imagePayload,
                imageSrc: resolveRichImageSrc(imagePayload)
            };
        })()
        : null;
    useEffect(() => {
        if (!isEditingTags || !onTagEditCancel) return;

        const onDocMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return;
            const root = itemRef.current;
            if (!root) return;
            const t = e.target as HTMLElement;

            if (root.contains(t)) {
                if (t.closest(".tag-edit-anchor")) return;
                if (t.closest(".item-tags-container .tag-chip")) return;
                if (
                    t.closest("button") ||
                    t.closest("input") ||
                    t.closest("textarea") ||
                    t.closest('[role="button"]') ||
                    t.closest(".drag-handle")
                ) {
                    return;
                }
            }

            onTagEditCancel();
            e.preventDefault();
            e.stopPropagation();
        };

        document.addEventListener("mousedown", onDocMouseDown, true);
        return () => document.removeEventListener("mousedown", onDocMouseDown, true);
    }, [isEditingTags, onTagEditCancel]);

    const sensitivePreview = useMemo(
        () => formatSensitivePreview(item.content, item.content_type, {
            prefixVisible: sensitiveMaskPrefixVisible,
            suffixVisible: sensitiveMaskSuffixVisible,
            maskEmailDomain: sensitiveMaskEmailDomain,
        }),
        [
            item.content,
            item.content_type,
            sensitiveMaskPrefixVisible,
            sensitiveMaskSuffixVisible,
            sensitiveMaskEmailDomain
        ]
    );
    const richTextCleanHtml = richTextFallback?.cleanHtml || item.html_content || "";
    const richTextSnapshotRenderMaxHeight = 200;
    const spreadsheetLikeRichSource = item.content_type === "rich_text"
        && !!item.html_content
        && isSpreadsheetLikeSource(item.source_app, item.source_app_path);
    const richTextHasAnimatedImageFallback = isAnimatedGifSrc(
        richTextFallback?.imagePayload || richTextFallback?.imageSrc || null
    );
    const preferHtmlRichPreview = item.content_type === "rich_text"
        && !!item.html_content
        && !richTextHasAnimatedImageFallback
        && !richHtmlLooksTabular(richTextCleanHtml)
        && !spreadsheetLikeRichSource;
    const preferGeneratedRichPreview = item.content_type === "rich_text"
        && !!item.html_content
        && !preferHtmlRichPreview
        && (
            !!richTextSnapshotPreview
            || richHtmlLooksTabular(richTextCleanHtml)
            || spreadsheetLikeRichSource
        );
    const richTextSnapshotSrc = useMemo(() => {
        if (!preferGeneratedRichPreview) return null;
        if (item.content_type !== "rich_text" || !item.html_content) return null;
        if (!richTextCleanHtml) return null;
        return getRichTextSnapshotDataUrl(richTextCleanHtml, {
            width: 560,
            // Keep source snapshot height bounded so list-item preview does not over-shrink text.
            maxHeight: richTextSnapshotRenderMaxHeight
        });
    }, [
        preferGeneratedRichPreview,
        item.content_type,
        item.html_content,
        richTextCleanHtml,
        richTextSnapshotRenderMaxHeight
    ]);
    const effectiveRichTextSnapshotSrc = !snapshotFailed ? richTextSnapshotSrc : null;
    const effectiveRichImageFallbackSrc = !richImageFallbackFailed
        ? (richTextFallback?.imageSrc || null)
        : null;
    const preferImageFallbackForTabular = (
        richHtmlLooksTabular(richTextCleanHtml) || spreadsheetLikeRichSource
    ) && !!effectiveRichImageFallbackSrc;
    const richTextPreviewSrc = richTextHasAnimatedImageFallback
        ? (effectiveRichImageFallbackSrc || effectiveRichTextSnapshotSrc)
        : preferImageFallbackForTabular
            ? (effectiveRichImageFallbackSrc || effectiveRichTextSnapshotSrc)
            : (effectiveRichTextSnapshotSrc || null);
    const useSnapshotPreviewImage = !!richTextPreviewSrc && richTextPreviewSrc === effectiveRichTextSnapshotSrc;
    const useRichImageFallback = !!richTextPreviewSrc && richTextPreviewSrc === effectiveRichImageFallbackSrc;
    const visibleTagCount = item.tags?.length || 0;
    const hasTagsSection = visibleTagCount > 0 || isEditingTags;
    const standaloneColorValue = useMemo(
        () => getStandaloneColorValue(item.content_type, item.content),
        [item.content, item.content_type]
    );

    useEffect(() => {
        let cancelled = false;
        const sourceAppPath = item.source_app_path?.trim();
        const cachedIcon = peekSourceAppIcon(sourceAppPath);

        if (!showSourceAppIcon) {
            setSourceAppIcon(null);
            return () => {
                cancelled = true;
            };
        }

        if (cachedIcon !== undefined) {
            setSourceAppIcon(cachedIcon ?? null);
            return () => {
                cancelled = true;
            };
        }

        setSourceAppIcon(null);
        if (!sourceAppPath) {
            return () => {
                cancelled = true;
            };
        }

        getSourceAppIcon(sourceAppPath).then((icon) => {
            if (!cancelled) {
                setSourceAppIcon(icon);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [item.source_app_path, showSourceAppIcon]);

    useEffect(() => {
        let cancelled = false;
        const cachedIcon = peekFileIcon(singleFilePath);

        if (item.content_type !== "file" || item.file_preview_exists === false || !singleFilePath) {
            setFileIcon(null);
            return () => {
                cancelled = true;
            };
        }

        if (cachedIcon !== undefined) {
            setFileIcon(cachedIcon ?? null);
            return () => {
                cancelled = true;
            };
        }

        setFileIcon(null);
        getSystemFileIcon(singleFilePath).then((icon) => {
            if (!cancelled) {
                setFileIcon(icon);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [item.content_type, item.file_preview_exists, singleFilePath]);

    useEffect(() => {
        setSnapshotFailed(false);
        setRichImageFallbackFailed(false);
    }, [item.id, item.html_content, richTextSnapshotPreview]);

    useEffect(() => {
        if (richSnapshotFallbackTimerRef.current) {
            clearTimeout(richSnapshotFallbackTimerRef.current);
            richSnapshotFallbackTimerRef.current = null;
        }
        if (!useSnapshotPreviewImage) return;

        // Safety net: some WebView failures do not reliably fire <img onError>.
        richSnapshotFallbackTimerRef.current = setTimeout(() => {
            const img = richSnapshotImgRef.current;
            if (!img || !img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
                richPreviewFailureLog("snapshot image timeout -> fallback to html", {
                    itemId: item.id,
                    hasImageElement: !!img,
                    complete: img?.complete ?? false,
                    naturalWidth: img?.naturalWidth ?? 0,
                    naturalHeight: img?.naturalHeight ?? 0
                });
                setSnapshotFailed(true);
            }
        }, 700);

        return () => {
            if (richSnapshotFallbackTimerRef.current) {
                clearTimeout(richSnapshotFallbackTimerRef.current);
                richSnapshotFallbackTimerRef.current = null;
            }
        };
    }, [useSnapshotPreviewImage, effectiveRichTextSnapshotSrc, item.id]);

    return (
        <motion.div
            ref={itemRef}
            id={id}
            data-test-clipboard-item
            layout={!disableLayout}
            initial={false}
            animate={{ marginBottom: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={`history-item ${isSelected ? "selected" : ""} ${item.is_pinned ? "pinned" : ""} ${className || ''}`}
            onMouseDown={(e) => {
                const target = e.target as HTMLElement;
                if (e.button !== 0) return;

                if (isEditingTags) {
                    if (target.closest(".tag-edit-anchor")) return;
                    if (target.closest(".item-tags-container .tag-chip")) return;
                    if (target.closest('button, input, textarea, [role="button"], .drag-handle')) {
                        return;
                    }
                    if (target.closest('a')) return;
                    e.preventDefault();
                    e.stopPropagation();
                    onTagEditCancel?.();
                    return;
                }

                if (target.closest('button, input, textarea, [role="button"], .drag-handle')) {
                    return;
                }
                if (target.closest('a')) {
                    return;
                }
                // Preserve the original input focus until the paste keystroke is dispatched.
                e.preventDefault();
                onCopy(false); // Plain text by default
                onSelect();
            }}
            onClick={(e) => {
                if (isEditingTags) return;
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('input') || target.closest('textarea')) {
                    return;
                }
                // Prevent link navigation - we want to copy, not open links
                if (target.closest('a')) {
                    e.preventDefault();
                }
                // Copy is handled on mousedown so the source app keeps focus.
            }}
            onContextMenu={(e) => {
                const target = e.target as HTMLElement;
                if (isEditingTags) {
                    if (target.closest(".tag-edit-anchor")) return;
                    e.preventDefault();
                    e.stopPropagation();
                    onTagEditCancel?.();
                    return;
                }
                if (target.closest('button') || target.closest('input') || target.closest('textarea')) {
                    return;
                }
                e.preventDefault();
                // Prevent link navigation on right-click too
                if (target.closest('a')) {
                    e.stopPropagation();
                }
                onCopy(true); // Formatted text for right-click

                onSelect();
            }}
            onMouseEnter={() => {
                onNeedDetail?.();
            }}
        >
            <ClipboardItemMeta
                item={item}
                sourceAppIcon={sourceAppIcon}
                showSourceAppIcon={showSourceAppIcon}
                isRevealed={isRevealed}
                quickPasteHint={quickPasteHint}
                language={language}
                t={t}
                dragControls={dragControls}
                onToggleReveal={onToggleReveal}
                onOpen={onOpen}
                onTogglePin={onTogglePin}
                onToggleTagEditor={onToggleTagEditor}
                onDelete={onDelete}
            />

            <ClipboardItemContent
                item={item}
                t={t}
                isSensitiveHidden={isSensitiveHidden}
                sensitivePreview={sensitivePreview}
                filePaths={filePaths}
                fileIcon={fileIcon}
                richTextPreviewSrc={richTextPreviewSrc}
                richTextCleanHtml={richTextCleanHtml}
                effectiveRichTextSnapshotSrc={effectiveRichTextSnapshotSrc}
                useSnapshotPreviewImage={useSnapshotPreviewImage}
                useRichImageFallback={useRichImageFallback}
                standaloneColorValue={standaloneColorValue}
                richSnapshotImgRef={richSnapshotImgRef}
                richSnapshotFallbackTimerRef={richSnapshotFallbackTimerRef}
                setSnapshotFailed={setSnapshotFailed}
                setRichImageFallbackFailed={setRichImageFallbackFailed}
            />

            {hasTagsSection && (
                <ClipboardItemTags
                    itemId={item.id}
                    tags={item.tags}
                    isEditing={isEditingTags}
                    tagInput={tagInput}
                    tagSuggestions={tagSuggestions}
                    theme={theme}
                    tagColors={tagColors}
                    t={t}
                    onTagInput={onTagInput}
                    onTagAdd={onTagAdd}
                    onTagPick={onTagPick}
                    onTagEditCancel={onTagEditCancel}
                    onTagDelete={onTagDelete}
                />
            )}
        </motion.div >
    );
};

export default memo(ClipboardItem, (prevProps, nextProps) => {
    return prevProps.isSelected === nextProps.isSelected &&
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.content_type === nextProps.item.content_type &&
        prevProps.item.timestamp === nextProps.item.timestamp &&
        prevProps.item.content === nextProps.item.content &&
        prevProps.item.preview === nextProps.item.preview &&
        prevProps.item.html_content === nextProps.item.html_content &&
        prevProps.item.source_app === nextProps.item.source_app &&
        prevProps.item.source_app_path === nextProps.item.source_app_path &&
        prevProps.item.is_pinned === nextProps.item.is_pinned &&
        prevProps.item.is_external === nextProps.item.is_external &&
        prevProps.item.file_preview_exists === nextProps.item.file_preview_exists &&
        prevProps.item.tags === nextProps.item.tags &&
        prevProps.isRevealed === nextProps.isRevealed &&
        prevProps.isEditingTags === nextProps.isEditingTags &&
        prevProps.richTextSnapshotPreview === nextProps.richTextSnapshotPreview &&
        prevProps.showSourceAppIcon === nextProps.showSourceAppIcon &&
        prevProps.quickPasteHint?.slot === nextProps.quickPasteHint?.slot &&
        prevProps.quickPasteHint?.combo === nextProps.quickPasteHint?.combo &&
        prevProps.theme === nextProps.theme &&
        prevProps.language === nextProps.language &&
        prevProps.tagInput === nextProps.tagInput &&
        (prevProps.tagSuggestions ?? []).join('\u0000') === (nextProps.tagSuggestions ?? []).join('\u0000');
});
