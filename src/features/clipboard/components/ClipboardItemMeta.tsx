import type { MouseEvent } from "react";
import type { DragControls } from "framer-motion";
import {
    Code,
    ExternalLink,
    Eye,
    EyeOff,
    File,
    FileText,
    GripVertical,
    Image as ImageIcon,
    Link as LinkIcon,
    Pin,
    PinOff,
    Tag,
    Video,
    X
} from "lucide-react";
import { getConciseTime } from "../../../shared/lib/utils";
import { hasSensitiveTag } from "../../../shared/lib/sensitiveTags";
import type { ClipboardEntry, Locale } from "../../../shared/types";
import type { QuickPasteHint } from "../types";

interface ClipboardItemMetaProps {
    item: ClipboardEntry;
    sourceAppIcon: string | null;
    showSourceAppIcon: boolean;
    isRevealed: boolean;
    quickPasteHint?: QuickPasteHint;
    language: Locale;
    t: (key: string) => string;
    dragControls?: DragControls;
    onToggleReveal: (event: MouseEvent) => void;
    onOpen: (event: MouseEvent) => void;
    onTogglePin: (event: MouseEvent) => void;
    onToggleTagEditor: (event: MouseEvent) => void;
    onDelete: (event: MouseEvent) => void;
}

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

const ClipboardItemMeta = ({
    item,
    sourceAppIcon,
    showSourceAppIcon,
    isRevealed,
    quickPasteHint,
    language,
    t,
    dragControls,
    onToggleReveal,
    onOpen,
    onTogglePin,
    onToggleTagEditor,
    onDelete
}: ClipboardItemMetaProps) => (
    <div className="clipboard-item__meta">
        <div className="clipboard-item__meta-left">
            {dragControls && (
                <div
                    className="clipboard-item__drag-handle"
                    onPointerDown={(event) => dragControls.start(event)}
                    onClick={(event) => event.stopPropagation()}
                    style={{ cursor: 'grab', opacity: 0.5, display: 'flex', alignItems: 'center', touchAction: 'none' }}
                >
                    <GripVertical size={14} />
                </div>
            )}
            <div className="clipboard-item__source">
                {item.is_pinned && !dragControls && <Pin size={10} style={{ color: 'var(--accent-color)', marginRight: '-2px' }} />}
                {showSourceAppIcon && sourceAppIcon
                    ? <img src={sourceAppIcon} alt={`${item.source_app} icon`} className="clipboard-item__source-icon" loading="lazy" />
                    : getIcon(item.content_type)}
                <span>{item.source_app}</span>
            </div>
        </div>

        <div className="clipboard-item__meta-right">
            <div className="clipboard-item__actions">
                {hasSensitiveTag(item.tags) && (
                    <button className={`ui-button ui-button--icon ${isRevealed ? "ui-button--active" : ""}`} onClick={onToggleReveal} title={isRevealed ? t('hide') : t('reveal')}>
                        {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                )}
                <button className="ui-button ui-button--icon" onClick={onOpen} title={t('open')}><ExternalLink size={12} /></button>
                <button className={`ui-button ui-button--icon ${item.is_pinned ? "ui-button--active" : ""}`} onClick={onTogglePin} title={item.is_pinned ? t('unpin') : t('pin')}>
                    {item.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
                </button>
                <button className={`ui-button ui-button--icon ${item.tags && item.tags.length > 0 ? "ui-button--active" : ""}`} onClick={onToggleTagEditor} title="Tags">
                    <Tag size={12} />
                </button>
                <button className="ui-button ui-button--icon" onClick={onDelete} title={t('delete')}><X size={12} /></button>
            </div>
            <div className="clipboard-item__meta-info">
                {quickPasteHint && item.is_pinned && (
                    <span className="clipboard-item__quick-paste" title={`${t('quick_paste_modifier')}: ${quickPasteHint.combo}`}>{quickPasteHint.combo}</span>
                )}
                <span>{getConciseTime(item.timestamp, language)}</span>
            </div>
        </div>
    </div>
);

export default ClipboardItemMeta;
