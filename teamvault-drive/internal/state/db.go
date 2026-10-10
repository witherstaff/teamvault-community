package state

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "github.com/glebarez/go-sqlite"
)

type DB struct {
	conn *sql.DB
}

func InitDB(dbPath string) (*DB, error) {
	if err := os.MkdirAll(filepath.Dir(dbPath), 0755); err != nil {
		return nil, err
	}

	conn, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	const createSchema = `
	CREATE TABLE IF NOT EXISTS local_files (
		object_id TEXT PRIMARY KEY,
		path TEXT NOT NULL,
		checksum TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		local_mtime INTEGER NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_path ON local_files(path);
	CREATE TABLE IF NOT EXISTS sync_meta (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);
	`
	if _, err := conn.Exec(createSchema); err != nil {
		return nil, fmt.Errorf("failed to create schema: %w", err)
	}

	return &DB{conn: conn}, nil
}

func (db *DB) Close() error {
	return db.conn.Close()
}

func (db *DB) SetMeta(key, value string) error {
	_, err := db.conn.Exec(`
		INSERT INTO sync_meta (key, value) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
		key, value)
	return err
}

func (db *DB) GetMeta(key string) (string, error) {
	var value string
	err := db.conn.QueryRow(`SELECT value FROM sync_meta WHERE key = ?`, key).Scan(&value)
	return value, err
}
