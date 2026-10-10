package state

type LocalFile struct {
	ObjectID   string
	Path       string
	Checksum   string
	UpdatedAt  string
	LocalMtime int64
}

func (db *DB) UpsertFile(f LocalFile) error {
	query := `
		INSERT INTO local_files (object_id, path, checksum, updated_at, local_mtime)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(object_id) DO UPDATE SET
			path=excluded.path,
			checksum=excluded.checksum,
			updated_at=excluded.updated_at,
			local_mtime=excluded.local_mtime;
	`
	_, err := db.conn.Exec(query, f.ObjectID, f.Path, f.Checksum, f.UpdatedAt, f.LocalMtime)
	return err
}

func (db *DB) GetAllFiles() (map[string]LocalFile, error) {
	rows, err := db.conn.Query(`SELECT object_id, path, checksum, updated_at, local_mtime FROM local_files`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make(map[string]LocalFile)
	for rows.Next() {
		var f LocalFile
		if err := rows.Scan(&f.ObjectID, &f.Path, &f.Checksum, &f.UpdatedAt, &f.LocalMtime); err != nil {
			return nil, err
		}
		res[f.ObjectID] = f
	}
	return res, nil
}

func (db *DB) DeleteFile(objectID string) error {
	_, err := db.conn.Exec(`DELETE FROM local_files WHERE object_id = ?`, objectID)
	return err
}

// DeleteFilesByPath removes all state records for a given path except the one
// with the given objectID. Call this before UpsertFile to prevent stale
// duplicate entries from accumulating when a file is re-uploaded with a new ID.
func (db *DB) DeleteFilesByPath(path, keepObjectID string) error {
	_, err := db.conn.Exec(
		`DELETE FROM local_files WHERE path = ? AND object_id != ?`,
		path, keepObjectID,
	)
	return err
}
