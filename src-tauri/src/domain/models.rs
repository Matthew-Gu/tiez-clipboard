use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClipboardEntry {
    pub id: i64,
    pub content_type: String, // 'text', 'image', 'code', 'file', 'video'
    pub content: String,
    #[serde(default)]
    pub html_content: Option<String>,
    pub source_app: String,
    #[serde(default)]
    pub source_app_path: Option<String>,
    pub timestamp: i64,
    pub preview: String,
    pub is_pinned: bool,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub use_count: i32,
    #[serde(default)]
    pub is_external: bool, // New field to track if content is a file path
    #[serde(default)]
    pub pinned_order: i64, // For manual sorting of pinned items
    #[serde(default = "default_true")]
    pub file_preview_exists: bool, // Transient field: does the file exist on disk?
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardEntrySummary {
    pub id: i64,
    pub content_type: String,
    pub content_hint: Option<String>,
    pub content_length: usize,
    pub source_app: String,
    pub source_app_path: Option<String>,
    pub timestamp: i64,
    pub preview: String,
    pub is_pinned: bool,
    pub tags: Vec<String>,
    pub use_count: i32,
    pub is_external: bool,
    pub pinned_order: i64,
    pub file_preview_exists: bool,
}

impl ClipboardEntrySummary {
    pub fn from_entry(entry: &ClipboardEntry) -> Self {
        let content_hint = match entry.content_type.as_str() {
            "file" | "video" => Some(entry.content.clone()),
            "image" if entry.is_external && !entry.content.starts_with("data:") => {
                Some(entry.content.clone())
            }
            _ => None,
        };

        Self {
            id: entry.id,
            content_type: entry.content_type.clone(),
            content_hint,
            content_length: entry.content.chars().count(),
            source_app: entry.source_app.clone(),
            source_app_path: entry.source_app_path.clone(),
            timestamp: entry.timestamp,
            preview: entry.preview.clone(),
            is_pinned: entry.is_pinned,
            tags: entry.tags.clone(),
            use_count: entry.use_count,
            is_external: entry.is_external,
            pinned_order: entry.pinned_order,
            file_preview_exists: entry.file_preview_exists,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardEntryDetail {
    pub id: i64,
    pub content_type: String,
    pub content: String,
    pub html_content: Option<String>,
}

impl ClipboardEntryDetail {
    pub fn from_entry(entry: &ClipboardEntry) -> Self {
        Self {
            id: entry.id,
            content_type: entry.content_type.clone(),
            content: entry.content.clone(),
            html_content: entry.html_content.clone(),
        }
    }
}

fn default_true() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::{ClipboardEntry, ClipboardEntrySummary};

    fn image_entry(content: &str, is_external: bool) -> ClipboardEntry {
        ClipboardEntry {
            id: 1,
            content_type: "image".to_string(),
            content: content.to_string(),
            html_content: None,
            source_app: "test".to_string(),
            source_app_path: None,
            timestamp: 1,
            preview: "[Image Content]".to_string(),
            is_pinned: false,
            tags: Vec::new(),
            use_count: 0,
            is_external,
            pinned_order: 0,
            file_preview_exists: true,
        }
    }

    #[test]
    fn summary_drops_base64_image_content() {
        let summary =
            ClipboardEntrySummary::from_entry(&image_entry("data:image/png;base64,AAAA", false));
        assert_eq!(summary.content_hint, None);
        assert!(summary.content_length > 0);
    }

    #[test]
    fn summary_keeps_external_image_path_hint() {
        let summary =
            ClipboardEntrySummary::from_entry(&image_entry(r"C:\data\attachments\image.png", true));
        assert_eq!(
            summary.content_hint.as_deref(),
            Some(r"C:\data\attachments\image.png")
        );
    }
}
