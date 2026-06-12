import { convertFileSrc } from "@tauri-apps/api/core";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
    Cpu,
    File,
    FileArchive,
    FileCode,
    FileQuestion,
    FileText,
    Files,
    ImageOff,
    Music,
    Video
} from "lucide-react";
import HtmlContent from "../../../shared/components/HtmlContent";
import { toTauriLocalImageSrc } from "../../../shared/lib/localImageSrc";
import type { ClipboardEntry } from "../../../shared/types";

interface ClipboardItemContentProps {
    item: ClipboardEntry;
    t: (key: string) => string;
    isSensitiveHidden: boolean;
    sensitivePreview: string;
    filePaths: string[];
    fileIcon: string | null;
    richTextPreviewSrc: string | null;
    richTextCleanHtml: string;
    effectiveRichTextSnapshotSrc: string | null;
    useSnapshotPreviewImage: boolean;
    useRichImageFallback: boolean;
    standaloneColorValue: string | null;
    richSnapshotImgRef: MutableRefObject<HTMLImageElement | null>;
    richSnapshotFallbackTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
    setSnapshotFailed: Dispatch<SetStateAction<boolean>>;
    setRichImageFallbackFailed: Dispatch<SetStateAction<boolean>>;
}

const richPreviewFailureLog = (stage: string, detail?: Record<string, unknown>) => {
    console.warn("[RichTextPreview][MainList]", stage, detail || {});
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

const FileContent = ({
    item,
    t,
    filePaths,
    fileIcon
}: Pick<ClipboardItemContentProps, "item" | "t" | "filePaths" | "fileIcon">) => {
    if (item.file_preview_exists === false) {
        return (
            <div className="file-thumbnail-card error-bg" title={t('file_deleted') || "File Deleted"}>
                <div className="file-icon-wrapper error-icon"><FileQuestion size={24} /></div>
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
                <div className="file-icon-wrapper"><Files size={24} /></div>
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
                <div className="file-icon-wrapper"><File size={24} /></div>
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
                {fileIcon
                    ? <img src={fileIcon} alt={`${fileName || "file"} icon`} className="file-icon-image" loading="lazy" />
                    : getFallbackFileIcon(filePath)}
            </div>
            <div className="file-info-wrapper">
                <div className="file-name">{fileName}</div>
                <div className="file-hint">{dirPath}</div>
            </div>
        </div>
    );
};

const ClipboardItemContent = ({
    item,
    t,
    isSensitiveHidden,
    sensitivePreview,
    filePaths,
    fileIcon,
    richTextPreviewSrc,
    richTextCleanHtml,
    effectiveRichTextSnapshotSrc,
    useSnapshotPreviewImage,
    useRichImageFallback,
    standaloneColorValue,
    richSnapshotImgRef,
    richSnapshotFallbackTimerRef,
    setSnapshotFailed,
    setRichImageFallbackFailed
}: ClipboardItemContentProps) => {
    const richTextSnapshotDisplayMaxHeight = 64;

    return (
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
                                src={item.content.startsWith("data:")
                                    ? item.content
                                    : (toTauriLocalImageSrc(item.content) || (item.is_external ? convertFileSrc(item.content) : item.content))}
                                alt={t('image_preview')}
                                className="image-preview"
                                loading="lazy"
                                style={isSensitiveHidden ? { filter: 'blur(8px)' } : {}}
                                onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                    event.currentTarget.parentElement?.classList.add('image-load-error');
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
                                src={item.content.startsWith("data:") ? item.content : (toTauriLocalImageSrc(item.content) || item.content)}
                                preload="metadata"
                                muted
                                playsInline
                                className="video-thumbnail-element"
                                onLoadedMetadata={(event) => seekVideoPreviewFrame(event.currentTarget)}
                            />
                            <div className="video-play-overlay"><Video size={16} /></div>
                        </div>
                        <div className="video-info-wrapper">
                            <div className="video-name">{item.content.split(/[\\/]/).pop()}</div>
                        </div>
                    </div>
                ) : item.content_type === "file" ? (
                    <FileContent item={item} t={t} filePaths={filePaths} fileIcon={fileIcon} />
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
                                pointerEvents: 'none',
                                maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)'
                            }}
                        />
                    )
                ) : standaloneColorValue && !isSensitiveHidden ? (
                    <div className="color-code-preview">
                        <span className="color-code-swatch" style={{ background: standaloneColorValue }} aria-hidden="true" />
                        <span className="color-code-value">{standaloneColorValue}</span>
                    </div>
                ) : (
                    isSensitiveHidden
                        ? (
                            <div style={{ minHeight: '24px', opacity: 0.6, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)' }}>
                                <span style={{ letterSpacing: '1px' }}>{sensitivePreview}</span>
                                <span style={{ fontSize: '10px', opacity: 0.7 }}>({item.content.length} {t('chars') || 'chars'})</span>
                            </div>
                        )
                        : item.preview
                )}
            </div>
        </div>
    );
};

export default ClipboardItemContent;
