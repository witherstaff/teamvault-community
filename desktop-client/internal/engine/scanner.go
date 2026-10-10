package engine

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"os"
	"path/filepath"
	"strings"
)

type ScannedFile struct {
	RelativePath string
	Checksum     string
	Size         int64
	Mtime        int64
}

func ScanLocalDirectory(root string) (map[string]ScannedFile, error) {
	result := make(map[string]ScannedFile)

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			if info.Name() != "." && info.Name() != ".." && info.Name()[0] == '.' {
				return filepath.SkipDir
			}
			if strings.ToLower(info.Name()) == "verified downloads" {
				return filepath.SkipDir
			}
			return nil
		}

		relPath, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}

		relPath = filepath.ToSlash(relPath)

		if filepath.Base(relPath)[0] == '.' {
			return nil
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		hash := sha256.New()
		if _, err := io.Copy(hash, file); err != nil {
			return err
		}
		checksum := hex.EncodeToString(hash.Sum(nil))

		result[relPath] = ScannedFile{
			RelativePath: relPath,
			Checksum:     checksum,
			Size:         info.Size(),
			Mtime:        info.ModTime().Unix(),
		}

		return nil
	})

	return result, err
}
