use crate::app_state::{AppDataDir, SessionHistory};
use crate::database::DbState;
use crate::domain::models::{ClipboardEntry, ClipboardEntryDetail, ClipboardEntrySummary};
use crate::error::{AppError, AppResult};
use crate::infrastructure::repository::clipboard_repo::ClipboardRepository;
use crate::infrastructure::repository::tag_repo::TagRepository;
use crate::services::clipboard::build_entry_preview;
use tauri::{AppHandle, Emitter, State};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardHistoryPage {
    pub items: Vec<ClipboardEntrySummary>,
    pub pinned: Vec<ClipboardEntrySummary>,
    pub has_older: bool,
    pub has_newer: bool,
}

fn cursor_matches(entry: &ClipboardEntry, direction: &str, cursor: Option<(i64, i64)>) -> bool {
    let Some((timestamp, id)) = cursor else {
        return true;
    };
    if direction == "newer" {
        entry.timestamp > timestamp || (entry.timestamp == timestamp && entry.id > id)
    } else {
        entry.timestamp < timestamp || (entry.timestamp == timestamp && entry.id < id)
    }
}

#[tauri::command]
pub fn get_clipboard_history_page(
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    limit: i32,
    direction: Option<String>,
    cursor_timestamp: Option<i64>,
    cursor_id: Option<i64>,
    content_type: Option<String>,
    include_pinned: Option<bool>,
) -> AppResult<ClipboardHistoryPage> {
    let direction = direction.unwrap_or_else(|| "older".to_string());
    let cursor = cursor_timestamp.zip(cursor_id);
    let requested = limit.clamp(1, 200);
    let conn = state.conn.lock().unwrap();
    let mut items = state
        .repo
        .get_cursor_page_with_conn(
            &conn,
            requested + 1,
            &direction,
            cursor,
            content_type.as_deref(),
        )
        .map_err(AppError::from)?;
    let mut pinned = if include_pinned.unwrap_or(false) {
        state
            .repo
            .get_pinned_with_conn(&conn)
            .map_err(AppError::from)?
    } else {
        Vec::new()
    };
    drop(conn);

    let session_items = session.inner().0.lock().unwrap();
    for item in session_items.iter() {
        if let Some(filter) = content_type.as_deref() {
            if item.content_type != filter {
                continue;
            }
        }
        if item.is_pinned {
            if include_pinned.unwrap_or(false) {
                pinned.push(item.clone());
            }
        } else if cursor_matches(item, &direction, cursor) {
            items.push(item.clone());
        }
    }
    drop(session_items);

    if direction == "newer" {
        items.sort_by(|a, b| a.timestamp.cmp(&b.timestamp).then_with(|| a.id.cmp(&b.id)));
    } else {
        items.sort_by(|a, b| b.timestamp.cmp(&a.timestamp).then_with(|| b.id.cmp(&a.id)));
    }
    let has_extra = items.len() > requested as usize;
    items.truncate(requested as usize);
    if direction == "newer" {
        items.reverse();
    }

    pinned.sort_by(|a, b| {
        b.pinned_order
            .cmp(&a.pinned_order)
            .then_with(|| b.timestamp.cmp(&a.timestamp))
            .then_with(|| b.id.cmp(&a.id))
    });
    pinned.dedup_by_key(|entry| entry.id);

    Ok(ClipboardHistoryPage {
        items: items
            .iter()
            .map(ClipboardEntrySummary::from_entry)
            .collect(),
        pinned: pinned
            .iter()
            .map(ClipboardEntrySummary::from_entry)
            .collect(),
        has_older: if direction == "older" {
            has_extra
        } else {
            true
        },
        has_newer: if direction == "newer" {
            has_extra
        } else {
            cursor.is_some()
        },
    })
}

#[tauri::command]
pub fn search_clipboard_history_summaries(
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    search_term: String,
    limit: i32,
    tag_only: Option<bool>,
) -> AppResult<Vec<ClipboardEntrySummary>> {
    search_clipboard_history(state, session, search_term, limit, tag_only).map(|items| {
        items
            .iter()
            .map(ClipboardEntrySummary::from_entry)
            .collect()
    })
}

#[tauri::command]
pub fn get_clipboard_entry_detail(
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    id: i64,
) -> AppResult<ClipboardEntryDetail> {
    {
        let session_items = session.inner().0.lock().unwrap();
        if let Some(item) = session_items.iter().find(|item| item.id == id) {
            return Ok(ClipboardEntryDetail::from_entry(item));
        }
    }
    state
        .repo
        .get_entry_by_id(id)
        .map_err(AppError::from)?
        .map(|entry| ClipboardEntryDetail::from_entry(&entry))
        .ok_or_else(|| AppError::Validation("Entry not found".to_string()))
}

#[tauri::command]
pub fn get_clipboard_history(
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    limit: i32,
    offset: i32,
    content_type: Option<String>,
) -> AppResult<Vec<ClipboardEntry>> {
    // 1. Get history from repository
    let mut history = state
        .repo
        .get_history(limit, offset, content_type.as_deref())?;

    // 2. Add session history items (non-persisted) ONLY on the first page
    if offset == 0 {
        let session_items = session.inner().0.lock().unwrap();
        for item in session_items.iter().rev() {
            if let Some(ct) = content_type.as_deref() {
                if item.content_type != ct {
                    continue;
                }
            }
            // Avoid duplicates: if item is already in DB, it will have id > 0
            if !history.iter().any(|h| h.id == item.id && item.id != 0) {
                history.push(item.clone());
            }
        }
    }

    // 3. Apply stable sorting: Pinned -> Pinned Order -> Timestamp -> ID
    // This MUST match the repository's logic to maintain pagination stability
    history.sort_by(|a, b| {
        b.is_pinned
            .cmp(&a.is_pinned)
            .then_with(|| b.pinned_order.cmp(&a.pinned_order))
            .then_with(|| b.timestamp.cmp(&a.timestamp))
            .then_with(|| b.id.cmp(&a.id))
    });

    // 4. Truncate to limit
    if history.len() > limit as usize {
        history.truncate(limit as usize);
    }

    // 5. Truncate content for UI performance
    for item in &mut history {
        if (item.content_type == "text"
            || item.content_type == "code"
            || item.content_type == "url")
            && item.content.chars().count() > 2000
        {
            item.content = format!(
                "{}... [Truncated for speed]",
                item.content.chars().take(2000).collect::<String>()
            );
        }

        if item.content_type == "text" || item.content_type == "code" || item.content_type == "url"
        {
            item.preview = build_entry_preview(&item.content_type, &item.content, None);
        }
    }

    Ok(history)
}

#[tauri::command]
pub fn search_clipboard_history(
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    search_term: String,
    limit: i32,
    tag_only: Option<bool>,
) -> AppResult<Vec<ClipboardEntry>> {
    let is_tag_only = tag_only.unwrap_or(false);
    let mut history = state.repo.search(&search_term, limit, is_tag_only)?;

    let term = search_term.to_lowercase();
    let session_items = session.inner().0.lock().unwrap();
    for item in session_items.iter().rev() {
        let matches = if is_tag_only {
            item.tags.iter().any(|t| t.to_lowercase().contains(&term))
        } else {
            item.content.to_lowercase().contains(&term)
                || item.source_app.to_lowercase().contains(&term)
                || item.tags.iter().any(|t| t.to_lowercase().contains(&term))
        };

        if matches {
            if !history.iter().any(|h| h.id == item.id && item.id != 0) {
                history.push(item.clone());
            }
        }
    }

    history.sort_by(|a, b| b.timestamp.cmp(&a.timestamp).then_with(|| b.id.cmp(&a.id)));
    if history.len() > limit as usize {
        history.truncate(limit as usize);
    }

    for item in &mut history {
        if (item.content_type == "text"
            || item.content_type == "code"
            || item.content_type == "url")
            && item.content.chars().count() > 2000
        {
            item.content = format!(
                "{}... [Truncated for speed]",
                item.content.chars().take(2000).collect::<String>()
            );
        }

        if item.content_type == "text" || item.content_type == "code" || item.content_type == "url"
        {
            item.preview = build_entry_preview(&item.content_type, &item.content, None);
        }
    }

    Ok(history)
}

#[tauri::command]
pub fn delete_clipboard_entry(
    app_handle: AppHandle,
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    app_data: State<'_, AppDataDir>,
    id: i64,
) -> AppResult<()> {
    {
        let mut session_items = session.inner().0.lock().unwrap();
        session_items.retain(|item| item.id != id);
    }

    if id > 0 {
        let data_dir = app_data.0.lock().unwrap();
        state.repo.delete(id, Some(&data_dir))?;
    }
    let _ = app_handle.emit("clipboard-changed", ());
    Ok(())
}

#[tauri::command]
pub fn clear_clipboard_history(
    app_handle: AppHandle,
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    app_data: State<'_, AppDataDir>,
) -> AppResult<()> {
    {
        let mut session_items = session.inner().0.lock().unwrap();
        session_items.retain(|item| item.is_pinned || !item.tags.is_empty());
    }
    let data_dir = app_data.0.lock().unwrap();
    state.repo.clear(Some(&data_dir)).map_err(AppError::from)?;
    let _ = app_handle.emit("clipboard-changed", ());
    Ok(())
}

#[tauri::command]
pub fn get_tag_items(state: State<'_, DbState>, tag: String) -> AppResult<Vec<ClipboardEntry>> {
    let mut history = state
        .tag_repo
        .get_entries_by_tag(&tag)
        .map_err(AppError::from)?;

    for item in &mut history {
        if (item.content_type == "text"
            || item.content_type == "code"
            || item.content_type == "url")
            && item.content.chars().count() > 50000
        {
            item.content = format!(
                "{}... [Content Truncated]",
                item.content.chars().take(50000).collect::<String>()
            );
        }

        if item.content_type == "text" || item.content_type == "code" || item.content_type == "url"
        {
            item.preview = build_entry_preview(&item.content_type, &item.content, None);
        }
    }

    Ok(history)
}

#[tauri::command]
pub fn get_all_tags_info(
    state: State<'_, DbState>,
) -> AppResult<std::collections::HashMap<String, i32>> {
    state.tag_repo.get_all_with_counts().map_err(AppError::from)
}

#[tauri::command]
pub fn rename_tag_globally(
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    old_name: String,
    new_name: String,
) -> AppResult<()> {
    {
        let mut session_items = session.inner().0.lock().unwrap();
        for item in session_items.iter_mut() {
            for tag in item.tags.iter_mut() {
                if *tag == old_name {
                    *tag = new_name.clone();
                }
            }
            item.tags.sort();
            item.tags.dedup();
        }
    }

    state
        .tag_repo
        .rename(&old_name, &new_name)
        .map_err(AppError::from)
}

#[tauri::command]
pub fn delete_tag_from_all(
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    app_data: State<'_, AppDataDir>,
    tag_name: String,
) -> AppResult<()> {
    {
        let mut session_items = session.inner().0.lock().unwrap();
        session_items.retain(|item| !item.tags.contains(&tag_name));
    }

    let data_dir = app_data.0.lock().unwrap();
    state
        .tag_repo
        .delete_globally(&tag_name, Some(&data_dir))
        .map_err(AppError::from)
}

#[tauri::command]
pub fn create_new_tag(state: State<'_, DbState>, tag_name: String) -> AppResult<()> {
    state.tag_repo.create(&tag_name).map_err(AppError::from)
}

#[tauri::command]
pub fn get_clipboard_content(
    state: State<'_, DbState>,
    session: State<'_, SessionHistory>,
    id: i64,
) -> AppResult<String> {
    {
        let session_items = session.inner().0.lock().unwrap();
        if let Some(item) = session_items.iter().find(|i| i.id == id) {
            return Ok(item.content.clone());
        }
    }

    if let Some(content) = state.repo.get_entry_content(id).map_err(AppError::from)? {
        return Ok(content);
    }

    Err(AppError::Validation("Entry not found".to_string()))
}

#[tauri::command]
pub fn update_pinned_order(
    app_handle: AppHandle,
    state: State<'_, DbState>,
    orders: Vec<(i64, i64)>,
) -> AppResult<()> {
    state
        .repo
        .update_pinned_order(orders)
        .map_err(AppError::from)?;
    let _ = app_handle.emit("clipboard-changed", ());
    Ok(())
}

#[tauri::command]
pub fn get_db_count(state: State<'_, DbState>) -> AppResult<i64> {
    state.repo.get_count().map_err(AppError::from)
}

#[cfg(test)]
mod tests {
    use super::cursor_matches;
    use crate::domain::models::ClipboardEntry;

    fn entry(timestamp: i64, id: i64) -> ClipboardEntry {
        ClipboardEntry {
            id,
            content_type: "text".to_string(),
            content: String::new(),
            source_app: String::new(),
            source_app_path: None,
            timestamp,
            preview: String::new(),
            is_pinned: false,
            tags: Vec::new(),
            use_count: 0,
            is_external: false,
            pinned_order: 0,
            file_preview_exists: true,
        }
    }

    #[test]
    fn cursor_direction_uses_timestamp_and_id_tiebreaker() {
        let cursor = Some((10, 5));
        assert!(cursor_matches(&entry(9, 99), "older", cursor));
        assert!(cursor_matches(&entry(10, 4), "older", cursor));
        assert!(cursor_matches(&entry(11, 1), "newer", cursor));
        assert!(cursor_matches(&entry(10, 6), "newer", cursor));
        assert!(!cursor_matches(&entry(10, 5), "older", cursor));
    }
}
