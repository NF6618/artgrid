use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::fs;

pub fn init_db(db_path: &PathBuf) -> Result<Connection> {
    let conn = Connection::open(db_path)?;

    // ── Core asset table ─────────────────────────────────────────────────────
    conn.execute(
        "CREATE TABLE IF NOT EXISTS assets (
            id            TEXT    PRIMARY KEY,
            title         TEXT    NOT NULL,
            filename      TEXT    NOT NULL,
            filepath      TEXT    NOT NULL,
            type          TEXT    NOT NULL,
            size          TEXT    NOT NULL,
            width         INTEGER NOT NULL,
            height        INTEGER NOT NULL,
            favorite      BOOLEAN NOT NULL DEFAULT 0,
            date_added    TEXT    NOT NULL,
            url           TEXT    NOT NULL,
            notes         TEXT,
            archived      BOOLEAN NOT NULL DEFAULT 0,
            trashed       BOOLEAN NOT NULL DEFAULT 0,
            palette       TEXT,
            color_profile TEXT,
            folder_id     TEXT,
            thumbnail_url TEXT,
            document_id   TEXT,
            page_number   INTEGER,
            page_text     TEXT,
            status        TEXT NOT NULL DEFAULT 'indexed'
        )",
        [],
    )?;

    // Migration guards — errors swallowed intentionally (column already exists)
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN notes TEXT", []);
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN archived BOOLEAN DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN trashed BOOLEAN DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN palette TEXT", []);
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN color_profile TEXT", []);
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL", []);
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN thumbnail_url TEXT", []);
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN document_id TEXT REFERENCES documents(id) ON DELETE CASCADE", []);
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN page_number INTEGER", []);
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN page_text TEXT", []);
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN status TEXT NOT NULL DEFAULT 'indexed'", []);
    let _ = conn.execute("ALTER TABLE assets ADD COLUMN source_id TEXT UNIQUE", []);

    conn.execute(
        "CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (parent_id) REFERENCES folders (id) ON DELETE CASCADE
        )",
        [],
    )?;

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

    conn.execute(
        "CREATE TABLE IF NOT EXISTS board_nodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL UNIQUE,
            board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
            node_type TEXT NOT NULL,
            node_json TEXT NOT NULL,
            z_index INTEGER NOT NULL DEFAULT 0
        )",
        [],
    )?;

    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS board_nodes_rtree USING rtree(
            id,
            minX, maxX,
            minY, maxY
        )",
        [],
    )?;

    // ── Documents table ───────────────────────────────────────────────────────
    //
    // Parent record for every ingested file.
    //   Standalone image → document with page_count = 1, status = 'indexed'.
    //   PDF → document with one assets row per page linked via document_id.
    //
    // Status lifecycle: pending → extracting → embedding → indexed | failed
    conn.execute(
        "CREATE TABLE IF NOT EXISTS documents (
            id         TEXT PRIMARY KEY,
            title      TEXT NOT NULL,
            filename   TEXT NOT NULL,
            filepath   TEXT NOT NULL,
            type       TEXT NOT NULL,
            size       TEXT NOT NULL,
            date_added TEXT NOT NULL,
            status     TEXT NOT NULL DEFAULT 'pending',
            page_count INTEGER,
            error      TEXT
        )",
        [],
    )?;

    // ── Embedding storage ─────────────────────────────────────────────────────
    //
    // text_embedding / image_embedding are little-endian f32 BLOBs.
    // KNN cosine-similarity search runs in Rust over in-memory loaded vectors;
    // no sqlite-vec extension loading required.
    conn.execute(
        "CREATE TABLE IF NOT EXISTS asset_embeddings (
            asset_id        TEXT PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
            text_embedding  BLOB,
            image_embedding BLOB,
            model_version   TEXT NOT NULL DEFAULT 'stub-v1',
            indexed_at      TEXT NOT NULL
        )",
        [],
    )?;

    // Fast lookup: all asset pages for a given document
    let _ = conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_assets_document_id ON assets(document_id)",
        [],
    );

    Ok(conn)
}

pub fn reset_db_schema(db_path: &PathBuf) -> Result<Connection> {
    if db_path.exists() {
        let _ = fs::remove_file(db_path);
    }
    init_db(db_path)
}
