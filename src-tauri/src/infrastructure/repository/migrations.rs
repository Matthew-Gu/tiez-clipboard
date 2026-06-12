use rusqlite::{params, Connection, Result};
use serde_json::Value;

const REMOVED_RICH_TEXT_SETTINGS: [&str; 4] = [
    "app.capture_rich_text",
    "app.rich_text_snapshot_preview",
    "app.rich_paste_hotkey",
    "app.rich_text",
];

fn clipboard_history_has_html_content(conn: &Connection) -> Result<bool> {
    let mut stmt = conn.prepare("PRAGMA table_info(clipboard_history)")?;
    let columns = stmt.query_map([], |row| row.get::<_, String>(1))?;
    for column in columns {
        if column? == "html_content" {
            return Ok(true);
        }
    }
    Ok(false)
}

fn remove_rich_text_from_cleanup_policies(raw: &str) -> Option<String> {
    let mut value: Value = serde_json::from_str(raw).ok()?;
    let policies = value.as_array_mut()?;
    for policy in policies {
        let Some(content_types) = policy
            .as_object_mut()
            .and_then(|object| object.get_mut("contentTypes"))
            .and_then(Value::as_array_mut)
        else {
            continue;
        };
        content_types.retain(|content_type| content_type.as_str() != Some("rich_text"));
    }
    serde_json::to_string(&value).ok()
}

fn migrate_remove_rich_text(conn: &Connection) -> Result<()> {
    let tx = conn.unchecked_transaction()?;

    if clipboard_history_has_html_content(&tx)? {
        tx.execute_batch(
            "
            CREATE TABLE clipboard_history_without_rich_text (
                id INTEGER PRIMARY KEY,
                content_type TEXT NOT NULL,
                content TEXT NOT NULL,
                source_app TEXT NOT NULL,
                source_app_path TEXT,
                timestamp INTEGER NOT NULL,
                preview TEXT NOT NULL,
                is_pinned INTEGER NOT NULL DEFAULT 0,
                content_hash INTEGER NOT NULL DEFAULT 0,
                tags TEXT NOT NULL DEFAULT '[]',
                use_count INTEGER NOT NULL DEFAULT 0,
                is_external INTEGER NOT NULL DEFAULT 0,
                pinned_order INTEGER NOT NULL DEFAULT 0
            );
            INSERT INTO clipboard_history_without_rich_text (
                id, content_type, content, source_app, source_app_path, timestamp, preview,
                is_pinned, content_hash, tags, use_count, is_external, pinned_order
            )
            SELECT
                id,
                CASE WHEN content_type = 'rich_text' THEN 'text' ELSE content_type END,
                content, source_app, source_app_path, timestamp, preview,
                is_pinned, content_hash, tags, use_count, is_external, pinned_order
            FROM clipboard_history;
            DROP TABLE clipboard_history;
            ALTER TABLE clipboard_history_without_rich_text RENAME TO clipboard_history;
            ",
        )?;
    } else {
        tx.execute(
            "UPDATE clipboard_history SET content_type = 'text' WHERE content_type = 'rich_text'",
            [],
        )?;
    }

    for key in REMOVED_RICH_TEXT_SETTINGS {
        tx.execute("DELETE FROM settings WHERE key = ?1", params![key])?;
    }

    let policies = tx
        .query_row(
            "SELECT value FROM settings WHERE key = 'app.app_cleanup_policies'",
            [],
            |row| row.get::<_, String>(0),
        )
        .ok();
    if let Some(normalized) = policies
        .as_deref()
        .and_then(remove_rich_text_from_cleanup_policies)
    {
        tx.execute(
            "UPDATE settings SET value = ?1 WHERE key = 'app.app_cleanup_policies'",
            params![normalized],
        )?;
    }

    tx.commit()
}

pub fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS clipboard_history (
            id INTEGER PRIMARY KEY,
            content_type TEXT NOT NULL,
            content TEXT NOT NULL,
            source_app TEXT NOT NULL,
            source_app_path TEXT,
            timestamp INTEGER NOT NULL,
            preview TEXT NOT NULL,
            is_pinned INTEGER NOT NULL DEFAULT 0,
            content_hash INTEGER NOT NULL DEFAULT 0,
            tags TEXT NOT NULL DEFAULT '[]',
            use_count INTEGER NOT NULL DEFAULT 0,
            is_external INTEGER NOT NULL DEFAULT 0,
            pinned_order INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS saved_tags (
            name TEXT PRIMARY KEY,
            color TEXT
        );
        CREATE TABLE IF NOT EXISTS entry_tags (
            entry_id INTEGER NOT NULL,
            tag TEXT NOT NULL,
            PRIMARY KEY (entry_id, tag)
        );
        ",
    )?;

    migrate_remove_rich_text(conn)?;

    conn.execute_batch(
        "
        CREATE INDEX IF NOT EXISTS idx_clipboard_history_pinned_order_time
            ON clipboard_history (is_pinned, pinned_order, timestamp);
        CREATE INDEX IF NOT EXISTS idx_clipboard_history_type_hash
            ON clipboard_history (content_type, content_hash);
        CREATE INDEX IF NOT EXISTS idx_clipboard_history_timestamp
            ON clipboard_history (timestamp);
        CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags (tag);
        CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags (entry_id);
        INSERT OR IGNORE INTO saved_tags (name) VALUES ('sensitive');
        INSERT OR IGNORE INTO saved_tags (name) VALUES ('密码');
        INSERT OR IGNORE INTO saved_tags (name) VALUES ('password');
        ",
    )
}

#[cfg(test)]
mod tests {
    use super::run_migrations;
    use rusqlite::Connection;

    fn columns(conn: &Connection) -> Vec<String> {
        let mut stmt = conn
            .prepare("PRAGMA table_info(clipboard_history)")
            .unwrap();
        stmt.query_map([], |row| row.get(1))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap()
    }

    #[test]
    fn fresh_database_has_no_rich_text_column_or_settings() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();

        assert!(!columns(&conn).iter().any(|column| column == "html_content"));
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM settings WHERE key IN (
                    'app.capture_rich_text', 'app.rich_text_snapshot_preview',
                    'app.rich_paste_hotkey', 'app.rich_text'
                )",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn old_database_is_migrated_once_and_preserves_metadata() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE clipboard_history (
                id INTEGER PRIMARY KEY, content_type TEXT NOT NULL, content TEXT NOT NULL,
                html_content TEXT, source_app TEXT NOT NULL, source_app_path TEXT,
                timestamp INTEGER NOT NULL, preview TEXT NOT NULL,
                is_pinned INTEGER NOT NULL DEFAULT 0, content_hash INTEGER NOT NULL DEFAULT 0,
                tags TEXT NOT NULL DEFAULT '[]', use_count INTEGER NOT NULL DEFAULT 0,
                is_external INTEGER NOT NULL DEFAULT 0, pinned_order INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            INSERT INTO clipboard_history VALUES
                (7, 'rich_text', 'plain', '<b>plain</b>', 'Word', 'word.exe', 123, 'plain',
                 1, 99, '[\"work\"]', 4, 0, 8);
            INSERT INTO settings VALUES ('app.capture_rich_text', 'true');
            INSERT INTO settings VALUES (
                'app.app_cleanup_policies',
                '[{\"id\":\"1\",\"contentTypes\":[\"text\",\"rich_text\",\"image\"]}]'
            );
            ",
        )
        .unwrap();

        run_migrations(&conn).unwrap();
        run_migrations(&conn).unwrap();

        assert!(!columns(&conn).iter().any(|column| column == "html_content"));
        let row: (String, String, i64, String, i64, i64) = conn
            .query_row(
                "SELECT content_type, content, is_pinned, tags, use_count, pinned_order
                 FROM clipboard_history WHERE id = 7",
                [],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                    ))
                },
            )
            .unwrap();
        assert_eq!(
            row,
            (
                "text".to_string(),
                "plain".to_string(),
                1,
                "[\"work\"]".to_string(),
                4,
                8
            )
        );
        let policies: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'app.app_cleanup_policies'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(
            policies,
            "[{\"contentTypes\":[\"text\",\"image\"],\"id\":\"1\"}]"
        );
        let index_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master
                 WHERE type = 'index' AND name = 'idx_clipboard_history_type_hash'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(index_count, 1);
    }

    #[test]
    fn invalid_cleanup_policy_is_preserved() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('app.app_cleanup_policies', 'invalid')",
            [],
        )
        .unwrap();

        run_migrations(&conn).unwrap();

        let value: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'app.app_cleanup_policies'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(value, "invalid");
    }
}
