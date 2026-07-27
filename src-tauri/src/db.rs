use rusqlite::{Connection, Result};
use std::path::PathBuf;

pub fn init_db(db_path: &PathBuf) -> Result<Connection> {
    let conn = Connection::open(db_path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            type TEXT NOT NULL,
            size TEXT NOT NULL,
            width INTEGER NOT NULL,
            height INTEGER NOT NULL,
            favorite BOOLEAN NOT NULL DEFAULT 0,
            date_added TEXT NOT NULL,
            url TEXT NOT NULL,
            notes TEXT,
            archived BOOLEAN NOT NULL DEFAULT 0,
            trashed BOOLEAN NOT NULL DEFAULT 0,
            palette TEXT,
            color_profile TEXT
        )",
        [],
    )?;

    // Migrations for existing databases
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN notes TEXT", []);
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN archived BOOLEAN DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN trashed BOOLEAN DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN palette TEXT", []);
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN color_profile TEXT", []);

    conn.execute(
        "CREATE TABLE IF NOT EXISTS collections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            parent_id TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS asset_collections (
            asset_id TEXT NOT NULL,
            collection_id TEXT NOT NULL,
            PRIMARY KEY (asset_id, collection_id),
            FOREIGN KEY (asset_id) REFERENCES assets (id) ON DELETE CASCADE,
            FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS asset_tags (
            asset_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            PRIMARY KEY (asset_id, tag_id),
            FOREIGN KEY (asset_id) REFERENCES assets (id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS boards (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            nodes_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    Ok(conn)
}
