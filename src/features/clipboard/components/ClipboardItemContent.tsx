import { convertFileSrc } from "@tauri-apps/api/core";
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
import { toTauriLocalImageSrc } from "../../../shared/lib/localImageSrc";
import type { ClipboardEntry } from "../../../shared/types";

interface ClipboardItemContentProps {
    item: ClipboardEntry;
    t: (key: string) => string;
    isSensitiveHidden: boolean;
    sensitivePreview: string;
    filePaths: string[];
    fileIcon: string | null;
    standaloneColorValue: string | null;
}

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
            <div className="clipboard-item__file-card clipboard-item__file-card--error" title={t('file_deleted') || "File Deleted"}>
                <div className="clipboard-item__file-icon clipboard-item__file-icon--error"><FileQuestion size={24} /></div>
                <div className="clipboard-item__file-info">
                    <div className="clipboard-item__file-name clipboard-item__file-text--error">{t('file_deleted') || "Deleted"}</div>
                    <div className="clipboard-item__file-hint clipboard-item__file-text--error">{item.content}</div>
                </div>
            </div>
        );
    }

    if (filePaths.length > 1) {
        return (
            <div className="clipboard-item__file-card" title={item.content}>
                <div className="clipboard-item__file-icon"><Files size={24} /></div>
                <div className="clipboard-item__file-info">
                    <div className="clipboard-item__file-name">{filePaths.length} {t('items')}</div>
                    <div className="clipboard-item__file-hint">{filePaths[0].split(/[\\/]/).pop()} ...</div>
                </div>
            </div>
        );
    }

    const filePath = filePaths[0];
    if (!filePath) {
        return (
            <div className="clipboard-item__file-card" title={item.content}>
                <div className="clipboard-item__file-icon"><File size={24} /></div>
                <div className="clipboard-item__file-info">
                    <div className="clipboard-item__file-name">{t('file') || "File"}</div>
                    <div className="clipboard-item__file-hint">{item.content}</div>
                </div>
            </div>
        );
    }

    const fileName = filePath.split(/[\\/]/).pop();
    const dirPath = filePath.split(/[\\/]/).slice(0, -1).join('\\');
    return (
        <div className="clipboard-item__file-card" title={item.content}>
            <div className={`clipboard-item__file-icon${fileIcon ? " clipboard-item__file-icon--system" : ""}`}>
                {fileIcon
                    ? <img src={fileIcon} alt={`${fileName || "file"} icon`} className="clipboard-item__file-icon-image" loading="lazy" />
                    : getFallbackFileIcon(filePath)}
            </div>
            <div className="clipboard-item__file-info">
                <div className="clipboard-item__file-name">{fileName}</div>
                <div className="clipboard-item__file-hint">{dirPath}</div>
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
    standaloneColorValue
}: ClipboardItemContentProps) => {
    return (
        <div className="clipboard-item__preview-shell">
            <div className={`clipboard-item__preview ${item.content_type === 'file' ? 'clipboard-item__preview--file' : ''} ${isSensitiveHidden ? 'clipboard-item__preview--sensitive' : ''}`}>
                {item.content_type === "image" ? (
                    <div style={{ position: 'relative' }}>
                        {!item.content ? (
                            <div className="clipboard-item__image clipboard-item__error-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', height: '72px', fontSize: '12px' }}>
                                {item.preview}
                            </div>
                        ) : item.is_external && item.file_preview_exists === false ? (
                            <div className="clipboard-item__image clipboard-item__error-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', height: '100px', fontSize: '12px' }}>
                                <ImageOff size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                <span>{t('image_deleted') || 'Image Deleted'}</span>
                            </div>
                        ) : (
                            <img
                                src={item.content.startsWith("data:")
                                    ? item.content
                                    : (toTauriLocalImageSrc(item.content) || (item.is_external ? convertFileSrc(item.content) : item.content))}
                                alt={t('image_preview')}
                                className="clipboard-item__image"
                                loading="lazy"
                                style={isSensitiveHidden ? { filter: 'blur(8px)' } : {}}
                                onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                    event.currentTarget.parentElement?.classList.add('clipboard-item__image-wrap--error');
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
                    <div className="clipboard-item__video-card">
                        <div className="clipboard-item__video-thumbnail">
                            <video
                                src={item.content.startsWith("data:") ? item.content : (toTauriLocalImageSrc(item.content) || item.content)}
                                preload="metadata"
                                muted
                                playsInline
                                className="clipboard-item__video-element"
                                onLoadedMetadata={(event) => seekVideoPreviewFrame(event.currentTarget)}
                            />
                            <div className="clipboard-item__video-play"><Video size={16} /></div>
                        </div>
                        <div className="clipboard-item__video-info">
                            <div className="clipboard-item__video-name">{item.content.split(/[\\/]/).pop()}</div>
                        </div>
                    </div>
                ) : item.content_type === "file" ? (
                    <FileContent item={item} t={t} filePaths={filePaths} fileIcon={fileIcon} />
                ) : standaloneColorValue && !isSensitiveHidden ? (
                    <div className="clipboard-item__color">
                        <span className="clipboard-item__color-swatch" style={{ background: standaloneColorValue }} aria-hidden="true" />
                        <span className="clipboard-item__color-value">{standaloneColorValue}</span>
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
