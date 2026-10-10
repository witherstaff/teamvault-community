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

// ScanLocalDirectory walks root and returns all syncable files.
// It respects .tvignore patterns, skips hidden files/directories, and
// skips the special "Verified Downloads" folder.
// It also returns the loaded IgnoreRules so the caller can apply the same
// rules to the remote tree.
func ScanLocalDirectory(root string) (map[string]ScannedFile, *IgnoreRules, error) {
	rules := LoadIgnoreRules(root)
	result := make(map[string]ScannedFile)

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		name := info.Name()

		// Always skip hidden entries (dot-prefixed), but allow root itself.
		if path != root && len(name) > 0 && name[0] == '.' {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Skip the special Verified Downloads folder.
		if info.IsDir() && strings.EqualFold(name, "verified downloads") {
			return filepath.SkipDir
		}

		relPath, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		relPath = filepath.ToSlash(relPath)

		// Apply .tvignore rules.
		if relPath != "." && rules.Matches(relPath, info.IsDir()) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		if info.IsDir() {
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

		result[relPath] = ScannedFile{
			RelativePath: relPath,
			Checksum:     hex.EncodeToString(hash.Sum(nil)),
			Size:         info.Size(),
			Mtime:        info.ModTime().Unix(),
		}

		return nil
	})

	return result, rules, err
}
