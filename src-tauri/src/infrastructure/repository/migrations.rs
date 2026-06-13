use rusqlite::{Connection, Result};

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
        CREATE INDEX IF NOT EXISTS idx_clipboard_history_pinned_order_time
            ON clipboard_history (is_pinned, pinned_order, timestamp);
        CREATE INDEX IF NOT EXISTS idx_clipboard_history_type_hash
            ON clipboard_history (content_type, content_hash);
        CREATE INDEX IF NOT EXISTS idx_clipboard_history_timestamp
            ON clipboard_history (timestamp);
        CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags (tag);
        CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags (entry_id);
        INSERT OR IGNORE INTO saved_tags (name) VALUES ('sensitive');
        INSERT OR IGNORE INTO saved_tags (name) VALUES ('password');
        ",
    )
}

#[cfg(test)]
mod tests {
    use super::run_migrations;
    use rusqlite::Connection;

    #[test]
    fn initializes_current_schema_idempotently() {
        let conn = Connection::open_in_memory().unwrap();

        run_migrations(&conn).unwrap();
        run_migrations(&conn).unwrap();

        let table_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master
                 WHERE type = 'table' AND name IN (
                    'clipboard_history', 'settings', 'saved_tags', 'entry_tags'
                 )",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(table_count, 4);

        let index_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master
                 WHERE type = 'index' AND name = 'idx_clipboard_history_type_hash'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(index_count, 1);

        let saved_tags: Vec<String> = conn
            .prepare("SELECT name FROM saved_tags ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(Result::ok)
            .collect();
        assert_eq!(saved_tags, vec!["password", "sensitive"]);
    }
}
