export interface ClipboardEntry {
  id: number;
  content_type: string;
  content: string;
  html_content?: string;
  source_app: string;
  source_app_path?: string;
  timestamp: number;
  preview: string;
  is_pinned: boolean;
  tags: string[];
  use_count?: number;
  is_external?: boolean;
  pinned_order?: number;
  file_preview_exists?: boolean;
  content_length?: number;
  detail_loaded?: boolean;
}

export interface ClipboardEntrySummary {
  id: number;
  contentType: string;
  contentHint?: string;
  contentLength: number;
  sourceApp: string;
  sourceAppPath?: string;
  timestamp: number;
  preview: string;
  isPinned: boolean;
  tags: string[];
  useCount?: number;
  isExternal?: boolean;
  pinnedOrder?: number;
  filePreviewExists?: boolean;
}

export interface ClipboardEntryDetail {
  id: number;
  contentType: string;
  content: string;
  htmlContent?: string;
}

export interface ClipboardHistoryPage {
  items: ClipboardEntrySummary[];
  pinned: ClipboardEntrySummary[];
  hasOlder: boolean;
  hasNewer: boolean;
}
