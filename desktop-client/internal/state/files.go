package state

type LocalFile struct {
	ObjectID   string
	Path       string // relative path inside sync folder
	Checksum   string
	UpdatedAt  string // remote timestamptz
	LocalMtime int64  // linux epoch (modification time)
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

func (db *DB) GetFileByPath(path string) (*LocalFile, error) {
	query := `SELECT object_id, checksum, updated_at, local_mtime FROM local_files WHERE path = ?`
	row := db.conn.QueryRow(query, path)

	var f LocalFile
	f.Path = path
	err := row.Scan(&f.ObjectID, &f.Checksum, &f.UpdatedAt, &f.LocalMtime)
	if err != nil {
		return nil, err // often sql.ErrNoRows
	}
	return &f, nil
}

func (db *DB) GetAllFiles() (map[string]LocalFile, error) {
	query := `SELECT object_id, path, checksum, updated_at, local_mtime FROM local_files`
	rows, err := db.conn.Query(query)
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
