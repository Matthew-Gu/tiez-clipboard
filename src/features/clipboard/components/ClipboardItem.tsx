import { useRef, useEffect, useLayoutEffect, useState, useMemo, memo } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
    Pin,
    PinOff,
    Eye,
    EyeOff,
    ExternalLink,
    Tag,
    X,
    FileText,
    Image as ImageIcon,
    Link as LinkIcon,
    Code,
    File,
    Plus,
    Video,
    FileArchive,
    Music,
    FileCode,
    Cpu,
    Files,
    ImageOff,
    FileQuestion,
    GripVertical
} from "lucide-react";
import { motion } from "framer-motion";
import type { ClipboardItemProps } from "../types";
import {
    formatSensitivePreview,
    getConciseTime,
    getTagColor,
    getTagTextColor
} from "../../../shared/lib/utils";
import HtmlContent from "../../../shared/components/HtmlContent";
import { toTauriLocalImageSrc } from "../../../shared/lib/localImageSrc";
import { getRichTextSnapshotDataUrl } from "../../../shared/lib/richTextSnapshot";
import { getFileIcon as getSystemFileIcon, peekFileIcon } from "../../../shared/lib/fileIcon";
import { getSourceAppIcon, peekSourceAppIcon } from "../../../shared/lib/sourceAppIcon";
import { hasSensitiveTag } from "../../../shared/lib/sensitiveTags";
import { activateWindowFocus } from "../../../shared/ipc/commands";

const RICH_IMAGE_FALLBACK_PREFIX = "<!--TIEZ_RICH_IMAGE:";
const RICH_IMAGE_FALLBACK_SUFFIX = "-->";
const TABULAR_RICH_HTML_RE = /<(table|tr|td|th|thead|tbody|tfoot|colgroup|col)\b/i;
const SPREADSHEET_SOURCE_RE = /\b(excel|et|wps|sheet|spreadsheet|calc)\b/i;
const SPREADSHEET_APP_RE = /(?:^|[\\/])(excel|et|wps|wpssheet|soffice)(?:\.exe|\.app)?$/i;
const STANDALONE_COLOR_RE = /^(#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgb|hsl)a?\(\s*[^)]+\s*\))$/i;
const richPreviewFailureLog = (stage: string, detail?: Record<string, unknown>) => {
    console.warn("[RichTextPreview][MainList]", stage, detail || {});
};
const extractRichImageFallback = (html?: string): { cleanHtml?: string; imagePayload?: string } => {
    if (!html) return {};
    const start = html.lastIndexOf(RICH_IMAGE_FALLBACK_PREFIX);
    if (start < 0) return { cleanHtml: html };

    const markerStart = start + RICH_IMAGE_FALLBACK_PREFIX.length;
    const endRel = html.slice(markerStart).indexOf(RICH_IMAGE_FALLBACK_SUFFIX);
    if (endRel < 0) return { cleanHtml: html };

    const markerEnd = markerStart + endRel;
    const payload = html.slice(markerStart, markerEnd).trim();
    const cleanHtml = `${html.slice(0, start)}${html.slice(markerEnd + RICH_IMAGE_FALLBACK_SUFFIX.length)}`.trim();
    return {
        cleanHtml: cleanHtml || html,
        imagePayload: payload || undefined
    };
};

const resolveRichImageSrc = (payload?: string): string | null => {
    if (!payload) return null;
    const value = payload.trim();
    if (!value) return null;
    if (value.startsWith("data:image/")) return value;
    if (/^https?:\/\/asset\.localhost\//i.test(value)) return value;
    return toTauriLocalImageSrc(value);
};

const isAnimatedGifSrc = (src?: string | null): boolean => {
    const value = (src || "").trim().toLowerCase();
    if (!value) return false;
    return value.startsWith("data:image/gif") || /\.gif(?:$|[?#])/i.test(value);
};

const richHtmlLooksTabular = (html?: string): boolean => {
    if (!html) return false;
    return TABULAR_RICH_HTML_RE.test(html);
};

const isSpreadsheetLikeSource = (...candidates: Array<string | undefined>): boolean => {
    return candidates.some((candidate) => {
        const value = (candidate || "").trim();
        if (!value) return false;
        return SPREADSHEET_APP_RE.test(value) || SPREADSHEET_SOURCE_RE.test(value);
    });
};

const getStandaloneColorValue = (contentType: string, content: string): string | null => {
    if (contentType !== "text" && contentType !== "code") {
        return null;
    }

    const normalized = content.trim();
    if (!normalized || normalized.includes("\n")) {
        return null;
    }

    return STANDALONE_COLOR_RE.test(normalized) ? normalized : null;
};

const seekVideoPreviewFrame = (video: HTMLVideoElement | null) => {
    if (!video) return;
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    const maxSeek = Math.max(duration - 0.05, 0);
    if (maxSeek <= 0) return;
    const preferred = Math.min(duration * 0.1, 2);
    const target = Math.min(Math.max(preferred, 0.1), maxSeek);
    if (target <= 0) return;
    try {
        video.currentTime = target;
    } catch {
        // Ignore seek errors; fallback will just show the first frame.
    }
};

const getIcon = (type: string) => {
    switch (type) {
        case "text": return <FileText size={14} />;
        case "image": return <ImageIcon size={14} />;
        case "url": return <LinkIcon size={14} />;
        case "code": return <Code size={14} />;
        case "file": return <File size={14} />;
        case "video": return <Video size={14} />;
        default: return <FileText size={14} />;
    }
};

const renderSourceAppIcon = (iconSrc: string | null, contentType: string, sourceApp: string) => {
    if (!iconSrc) {
        return getIcon(contentType);
    }

    return (
        <img
            src={iconSrc}
            alt={`${sourceApp} icon`}
            className="source-app-icon"
            loading="lazy"
        />
    );
};

const getFallbackFileIcon = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'zip':
        case 'rar':
        case '7z':
        case 'tar':
        case 'gz':
            return <FileArchive size={20} />;
        case 'mp3':
        case 'wav':
        case 'flac':
        case 'm4a':
            return <Music size={20} />;
        case 'exe':
        case 'msi':
        case 'bat':
        case 'sh':
            return <Cpu size={20} />;
        case 'pdf':
        case 'doc':
        case 'docx':
        case 'ppt':
        case 'pptx':
        case 'xls':
        case 'xlsx':
            return <FileText size={20} />;
        case 'js':
        case 'ts':
        case 'tsx':
        case 'jsx':
        case 'py':
        case 'rs':
        case 'c':
        case 'cpp':
        case 'go':
        case 'java':
        case 'html':
        case 'css':
        case 'json':
            return <FileCode size={20} />;
        default:
            return <File size={20} />;
    }
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
    const tagInputRef = useRef<HTMLInputElement>(null);
    const [localTagInput, setLocalTagInput] = useState(tagInput);
    const [snapshotFailed, setSnapshotFailed] = useState(false);
    const [richImageFallbackFailed, setRichImageFallbackFailed] = useState(false);
    const [sourceAppIcon, setSourceAppIcon] = useState<string | null>(() => peekSourceAppIcon(item.source_app_path) ?? null);
    const filePaths = useMemo(
        () => item.content_type === "file" ? item.content.split('\n').filter((p) => p.trim()) : [],
        [item.content, item.content_type]
    );
    const singleFilePath = filePaths.length === 1 ? filePaths[0] : null;
    const [fileIcon, setFileIcon] = useState<string | null>(() => peekFileIcon(singleFilePath) ?? null);
    const isComposing = useRef(false);
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
    const pickableTagSuggestions = useMemo(() => {
        if (!isEditingTags) return [];
        const existing = new Set(item.tags || []);
        const q = localTagInput.trim().toLowerCase();
        return tagSuggestions
            .filter((tag) => !existing.has(tag))
            .filter((tag) => !q || tag.toLowerCase().includes(q))
            .slice(0, 14);
    }, [isEditingTags, item.tags, localTagInput, tagSuggestions]);

    const [tagSuggestIndex, setTagSuggestIndex] = useState(-1);
    const tagSuggestListRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isEditingTags) setTagSuggestIndex(-1);
    }, [isEditingTags]);

    useEffect(() => {
        setTagSuggestIndex((prev) => {
            if (pickableTagSuggestions.length === 0) return -1;
            if (prev < 0) return -1;
            return Math.min(prev, pickableTagSuggestions.length - 1);
        });
    }, [pickableTagSuggestions]);

    useLayoutEffect(() => {
        if (tagSuggestIndex < 0 || !tagSuggestListRef.current) return;
        const row = tagSuggestListRef.current.children[tagSuggestIndex] as HTMLElement | undefined;
        row?.scrollIntoView({ block: "nearest" });
    }, [tagSuggestIndex, pickableTagSuggestions]);

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
    const richTextSnapshotDisplayMaxHeight = 64;
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

    // Sync local state when prop changes (e.g. when editor opens)
    useEffect(() => {
        setLocalTagInput(tagInput);
    }, [tagInput]);

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

    useEffect(() => {
        if (isEditingTags && tagInputRef.current) {
            tagInputRef.current.focus();
        }
    }, [isEditingTags]);

    const renderFilePreview = () => {
        if (item.file_preview_exists === false) {
            return (
                <div className="file-thumbnail-card error-bg" title={t('file_deleted') || "File Deleted"}>
                    <div className="file-icon-wrapper error-icon">
                        <FileQuestion size={24} />
                    </div>
                    <div className="file-info-wrapper">
                        <div className="file-name error-text">{t('file_deleted') || "Deleted"}</div>
                        <div className="file-hint error-text">{item.content}</div>
                    </div>
                </div>
            );
        }

        if (filePaths.length > 1) {
            return (
                <div className="file-thumbnail-card" title={item.content}>
                    <div className="file-icon-wrapper">
                        <Files size={24} />
                    </div>
                    <div className="file-info-wrapper">
                        <div className="file-name">{filePaths.length} {t('items')}</div>
                        <div className="file-hint">{filePaths[0].split(/[\\/]/).pop()} ...</div>
                    </div>
                </div>
            );
        }

        const filePath = filePaths[0];
        if (!filePath) {
            return (
                <div className="file-thumbnail-card" title={item.content}>
                    <div className="file-icon-wrapper">
                        <File size={24} />
                    </div>
                    <div className="file-info-wrapper">
                        <div className="file-name">{t('file') || "File"}</div>
                        <div className="file-hint">{item.content}</div>
                    </div>
                </div>
            );
        }

        const fileName = filePath.split(/[\\/]/).pop();
        const dirPath = filePath.split(/[\\/]/).slice(0, -1).join('\\');

        return (
            <div className="file-thumbnail-card" title={item.content}>
                <div className={`file-icon-wrapper${fileIcon ? " file-icon-wrapper-system" : ""}`}>
                    {fileIcon ? (
                        <img
                            src={fileIcon}
                            alt={`${fileName || "file"} icon`}
                            className="file-icon-image"
                            loading="lazy"
                        />
                    ) : (
                        getFallbackFileIcon(filePath)
                    )}
                </div>
                <div className="file-info-wrapper">
                    <div className="file-name">{fileName}</div>
                    <div className="file-hint">{dirPath}</div>
                </div>
            </div>
        );
    };

    const renderTagsContainer = () => (
        <div
            className={`item-tags-container${isEditingTags ? ' tag-edit-active' : ''}`}
            style={{
                marginTop: '6px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                gap: '4px',
                paddingTop: '0'
            }}
        >
            {item.tags?.map((tag) => {
                const tagBackground = tagColors?.[tag] || getTagColor(tag, theme);
                const tagTextColor = getTagTextColor(tagBackground);
                return (
                    <span
                        key={tag}
                        className="tag-chip"
                        style={{
                            background: tagBackground,
                            color: tagTextColor,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        {tag}
                        {isEditingTags && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
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

            {isEditingTags && (
                <div className="tag-edit-anchor">
                    <div className="tag-edit-input-row">
                        <input
                            ref={tagInputRef}
                            type="text"
                            value={localTagInput}
                            onCompositionStart={() => {
                                isComposing.current = true;
                            }}
                            onCompositionEnd={(e) => {
                                isComposing.current = false;
                                const val = (e.target as HTMLInputElement).value;
                                setLocalTagInput(val);
                                onTagInput(val);
                            }}
                            onMouseDown={() => {
                                activateWindowFocus().catch(console.error);
                            }}
                            onFocus={() => {
                                activateWindowFocus().catch(console.error);
                            }}
                            onChange={(e) => {
                                const val = e.target.value;
                                setLocalTagInput(val);
                                if (!isComposing.current) {
                                    onTagInput(val);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onTagEditCancel?.();
                                    return;
                                }
                                const suggestionCount = pickableTagSuggestions.length;
                                if (e.key === 'ArrowDown' && suggestionCount > 0 && onTagPick) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTagSuggestIndex((prev) =>
                                        prev < 0 ? 0 : Math.min(prev + 1, suggestionCount - 1)
                                    );
                                    return;
                                }
                                if (e.key === 'ArrowUp' && suggestionCount > 0 && onTagPick) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTagSuggestIndex((prev) => (prev <= 0 ? -1 : prev - 1));
                                    return;
                                }
                                if (e.key === 'Enter' && !isComposing.current) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (
                                        onTagPick &&
                                        tagSuggestIndex >= 0 &&
                                        tagSuggestIndex < suggestionCount
                                    ) {
                                        const picked = pickableTagSuggestions[tagSuggestIndex];
                                        onTagPick(picked);
                                        setLocalTagInput('');
                                        setTagSuggestIndex(-1);
                                    } else {
                                        onTagAdd();
                                    }
                                }
                            }}
                            className="tag-input"
                            aria-autocomplete="list"
                            aria-controls={
                                pickableTagSuggestions.length > 0 && onTagPick
                                    ? `tag-suggest-list-${item.id}`
                                    : undefined
                            }
                            aria-activedescendant={
                                tagSuggestIndex >= 0 && pickableTagSuggestions.length > 0 && onTagPick
                                    ? `tag-suggest-opt-${item.id}-${tagSuggestIndex}`
                                    : undefined
                            }
                            placeholder={t('enter_tag_name')}
                            style={{
                                background: 'var(--bg-input)',
                                border: 'none',
                                borderRadius: '0',
                                padding: '2px 6px',
                                fontSize: '10px',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onTagAdd();
                            }}
                            className="btn-icon"
                            style={{ padding: '2px', height: '16px', width: '16px' }}
                        >
                            <Plus size={10} />
                        </button>
                    </div>
                    {pickableTagSuggestions.length > 0 && onTagPick && (
                        <div
                            ref={tagSuggestListRef}
                            id={`tag-suggest-list-${item.id}`}
                            className="tag-edit-suggestions-popover hide-scrollbar"
                            role="listbox"
                            aria-label={t('find_tags')}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            {pickableTagSuggestions.map((sTag, sIdx) => {
                                const bg = tagColors?.[sTag] || getTagColor(sTag, theme);
                                const fg = getTagTextColor(bg);
                                return (
                                    <button
                                        key={sTag}
                                        type="button"
                                        role="option"
                                        id={`tag-suggest-opt-${item.id}-${sIdx}`}
                                        aria-selected={tagSuggestIndex === sIdx}
                                        className={`tag-suggest-item${tagSuggestIndex === sIdx ? ' tag-suggest-item--active' : ''}`}
                                        onMouseEnter={() => setTagSuggestIndex(sIdx)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTagPick(sTag);
                                            setLocalTagInput('');
                                            setTagSuggestIndex(-1);
                                        }}
                                    >
                                        <span
                                            className="tag-suggest-pill"
                                            style={{
                                                background: bg,
                                                color: fg
                                            }}
                                        >
                                            {sTag}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

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
            <div className="item-meta">
                <div className="item-meta-left">
                    {dragControls && (
                        <div
                            className="drag-handle"
                            onPointerDown={(e) => dragControls.start(e)}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                cursor: 'grab',
                                opacity: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                touchAction: 'none'
                            }}
                        >
                            <GripVertical size={14} />
                        </div>
                    )}
                    <div className="app-info">
                        {item.is_pinned && !dragControls && <Pin size={10} style={{ color: 'var(--accent-color)', marginRight: '-2px' }} />}
                        {showSourceAppIcon
                            ? renderSourceAppIcon(sourceAppIcon, item.content_type, item.source_app)
                            : getIcon(item.content_type)}
                        <span>{item.source_app}</span>
                    </div>
                </div>

                <div className="item-meta-right">
                    <div className="item-actions">
                        {hasSensitiveTag(item.tags) && (
                            <button
                                className={`btn-icon ${isRevealed ? "active" : ""}`}
                                onClick={onToggleReveal}
                                title={isRevealed ? t('hide') : t('reveal')}
                            >
                                {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                        )}
                        <button
                            className="btn-icon"
                            onClick={onOpen}
                            title={t('open')}
                        >
                            <ExternalLink size={12} />
                        </button>
                        <button
                            className={`btn-icon ${item.is_pinned ? "active" : ""}`}
                            onClick={onTogglePin}
                            title={item.is_pinned ? t('unpin') : t('pin')}
                        >
                            {item.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
                        </button>
                        <button
                            className={`btn-icon ${item.tags && item.tags.length > 0 ? "active" : ""}`}
                            onClick={onToggleTagEditor}
                            title="Tags"
                        >
                            <Tag size={12} />
                        </button>
                        <button className="btn-icon" onClick={onDelete} title={t('delete')}>
                            <X size={12} />
                        </button>
                    </div>
                    <div className="item-meta-right-info">
                        {quickPasteHint && item.is_pinned && (
                            <span
                                className="quick-paste-hint"
                                title={`${t('quick_paste_modifier')}: ${quickPasteHint.combo}`}
                            >
                                {quickPasteHint.combo}
                            </span>
                        )}
                        <span>{getConciseTime(item.timestamp, language)}</span>
                    </div>
                </div>
            </div>

            <div className="content-preview-shell">
                <div className={`content-preview ${item.content_type === 'rich_text' ? 'rich-text' : ''} ${item.content_type === 'file' ? 'file-preview' : ''} ${isSensitiveHidden ? 'sensitive-blur' : ''}`}>
                {item.content_type === "image" ? (
                    <div style={{ position: 'relative' }}>
                        {!item.content ? (
                            <div className="image-preview error-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', height: '72px', fontSize: '12px' }}>
                                {item.preview}
                            </div>
                        ) : item.is_external && item.file_preview_exists === false ? (
                            <div className="image-preview error-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', height: '100px', fontSize: '12px' }}>
                                <ImageOff size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                <span>{t('image_deleted') || 'Image Deleted'}</span>
                            </div>
                        ) : (
                            <img
                                src={
                                    item.content.startsWith("data:")
                                        ? item.content
                                        : (
                                            toTauriLocalImageSrc(item.content) ||
                                            (item.is_external ? convertFileSrc(item.content) : item.content)
                                        )
                                }
                                alt={t('image_preview')}
                                className="image-preview"
                                loading="lazy"
                                style={isSensitiveHidden ? { filter: 'blur(8px)' } : {}}
                                onError={(e) => {
                                    // Fallback for load errors even if backend said it exists (e.g. deleted after fetch)
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement?.classList.add('image-load-error');
                                }}
                            />
                        )}
                        {isSensitiveHidden && (
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: 'bold', opacity: 0.5, fontSize: '10px' }}>
                                SENSITIVE
                            </div>
                        )}
                    </div>
                ) : item.content_type === "video" ? (
                    <div className="video-thumbnail-card">
                        <div className="video-thumbnail-wrapper">
                            <video
                                src={item.content.startsWith("data:")
                                    ? item.content
                                    : (toTauriLocalImageSrc(item.content) || item.content)}
                                preload="metadata"
                                muted
                                playsInline
                                className="video-thumbnail-element"
                                onLoadedMetadata={(e) => seekVideoPreviewFrame(e.currentTarget)}
                            />
                            <div className="video-play-overlay">
                                <Video size={16} />
                            </div>
                        </div>
                        <div className="video-info-wrapper">
                            <div className="video-name">{item.content.split(/[\\/]/).pop()}</div>
                        </div>
                    </div>
                ) : item.content_type === "file" ? (
                    renderFilePreview()
                ) : item.content_type === "rich_text" && item.html_content && !isSensitiveHidden ? (
                    richTextPreviewSrc ? (
                        <img
                            ref={richSnapshotImgRef}
                            src={richTextPreviewSrc}
                            alt="rich text preview"
                            onLoad={() => {
                                if (useSnapshotPreviewImage && richSnapshotFallbackTimerRef.current) {
                                    clearTimeout(richSnapshotFallbackTimerRef.current);
                                    richSnapshotFallbackTimerRef.current = null;
                                }
                            }}
                            onError={() => {
                                if (useRichImageFallback) {
                                    richPreviewFailureLog("fallback image load error -> switch to snapshot", {
                                        itemId: item.id,
                                        srcLength: (richTextPreviewSrc || "").length,
                                        srcSample: (richTextPreviewSrc || "").slice(0, 140)
                                    });
                                    setRichImageFallbackFailed(true);
                                    return;
                                }
                                if (richSnapshotFallbackTimerRef.current) {
                                    clearTimeout(richSnapshotFallbackTimerRef.current);
                                    richSnapshotFallbackTimerRef.current = null;
                                }
                                if (effectiveRichTextSnapshotSrc) {
                                    richPreviewFailureLog("snapshot image load error -> fallback to html", {
                                        itemId: item.id,
                                        srcLength: (richTextPreviewSrc || "").length,
                                        srcSample: (richTextPreviewSrc || "").slice(0, 140)
                                    });
                                    setSnapshotFailed(true);
                                }
                            }}
                            style={{
                                width: 'auto',
                                maxWidth: '100%',
                                maxHeight: `${richTextSnapshotDisplayMaxHeight}px`,
                                display: 'block',
                                marginRight: 'auto',
                                pointerEvents: 'none',
                                borderRadius: '4px',
                                maskImage: 'linear-gradient(to bottom, black 78%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to bottom, black 78%, transparent 100%)'
                            }}
                        />
                    ) : (
                        <HtmlContent
                            className="rich-text-preview"
                            htmlContent={richTextCleanHtml || item.html_content}
                            fallbackText={item.preview}
                            preview={true}
                            style={{
                                maxHeight: `${richTextSnapshotDisplayMaxHeight}px`,
                                overflow: 'hidden',
                                fontSize: 'var(--clipboard-item-font-size)',
                                lineHeight: '1.4',
                                position: 'relative',
                                pointerEvents: 'none', // Prevent interacting with links in the list
                                maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)'
                            }}
                        />
                    )
                ) : standaloneColorValue && !isSensitiveHidden ? (
                    <div className="color-code-preview">
                        <span
                            className="color-code-swatch"
                            style={{ background: standaloneColorValue }}
                            aria-hidden="true"
                        />
                        <span className="color-code-value">{standaloneColorValue}</span>
                    </div>
                ) : (
                    isSensitiveHidden
                        ? (
                            <div style={{ minHeight: '24px', opacity: 0.6, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)' }}>
                                <span style={{ letterSpacing: '1px' }}>
                                    {sensitivePreview}
                                </span>
                                <span style={{ fontSize: '10px', opacity: 0.7 }}>
                                    ({item.content.length} {t('chars') || 'chars'})
                                </span>
                            </div>
                        )
                        : item.preview
                )}
                </div>
            </div>

            {hasTagsSection && renderTagsContainer()}
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
