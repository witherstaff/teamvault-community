package engine

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"teamvault-drive/internal/api"
	"teamvault-drive/internal/state"

	"golang.org/x/sync/errgroup"
)

type Syncer struct {
	ApiClient         *api.Client
	StateDB           *state.DB
	LocalRoot         string
	Workspace         string
	ExcludedPaths     []string     // folder paths to skip (e.g. "Projects/Archive")
	StatusCallback    func(string) // optional: receives progress messages
	WatchIdleCallback func()       // optional: called after each sync completes inside Watch
}

func NewSyncer(apiClient *api.Client, db *state.DB, root, workspace string, excluded []string) *Syncer {
	return &Syncer{
		ApiClient:     apiClient,
		StateDB:       db,
		LocalRoot:     root,
		Workspace:     workspace,
		ExcludedPaths: excluded,
	}
}

// isValidSHA256 returns true only if s is a 64-character lowercase hex string.
// Any other value (empty, "ok", base64, etc.) is treated as an absent checksum.
func isValidSHA256(s string) bool {
	if len(s) != 64 {
		return false
	}
	for _, c := range s {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}
	return true
}

// isExcluded returns true if path falls under any of the excluded folder paths.
func isExcluded(path string, excluded []string) bool {
	for _, excl := range excluded {
		if path == excl || strings.HasPrefix(path, excl+"/") {
			return true
		}
	}
	return false
}

func (s *Syncer) status(format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	if s.StatusCallback != nil {
		s.StatusCallback(msg)
	} else {
		fmt.Println(msg)
	}
}

func (s *Syncer) watchIdle() {
	if s.WatchIdleCallback != nil {
		s.WatchIdleCallback()
	}
}

func (s *Syncer) Sync(ctx context.Context) error {
	s.status("Scanning local directory...")
	localScan, ignoreRules, err := ScanLocalDirectory(s.LocalRoot)
	if err != nil {
		return fmt.Errorf("local scan failed: %w", err)
	}

	s.status("Fetching remote tree...")
	remoteTree, canUpload, err := s.ApiClient.FetchTree(s.Workspace)
	if err != nil {
		return fmt.Errorf("failed to fetch remote tree: %w", err)
	}

	stateMap, err := s.StateDB.GetAllFiles()
	if err != nil {
		return fmt.Errorf("failed to load state db: %w", err)
	}

	remoteByPath := make(map[string]api.TreeItem)
	folderIDsByPath := make(map[string]string)
	remoteIDSet := make(map[string]bool)
	var rootFolderID string

	itemsByID := make(map[string]api.TreeItem)
	for _, item := range remoteTree {
		itemsByID[item.ID] = item
		remoteIDSet[item.ID] = true
		if item.Type == "folder" && item.Name == "/" {
			rootFolderID = item.ID
			folderIDsByPath["."] = item.ID
			folderIDsByPath[""] = item.ID
		}
	}

	if rootFolderID == "" {
		return fmt.Errorf("could not locate root '/' directory in remote tree")
	}

	var buildPath func(itemID string) string
	buildPath = func(itemID string) string {
		item, exists := itemsByID[itemID]
		if !exists || item.ID == rootFolderID {
			return ""
		}
		parentPath := buildPath(item.ParentID)
		if parentPath == "" {
			return item.Name
		}
		return parentPath + "/" + item.Name
	}

	for _, item := range remoteTree {
		if item.Type == "file" {
			fullPath := buildPath(item.ID)
			item.Name = fullPath
			remoteByPath[fullPath] = item
		} else if item.Type == "folder" && item.ID != rootFolderID {
			fullPath := buildPath(item.ID)
			folderIDsByPath[fullPath] = item.ID
		}
	}

	// === IGNORE RULES FILTER ===
	// Apply .tvignore to the remote tree so ignored files are never downloaded.
	for relPath := range remoteByPath {
		if ignoreRules.Matches(relPath, false) {
			delete(remoteByPath, relPath)
		}
	}

	// === SELECTIVE SYNC FILTER ===
	// Remove excluded paths from both maps so they are completely invisible to the sync engine.
	if len(s.ExcludedPaths) > 0 {
		for relPath := range localScan {
			if isExcluded(relPath, s.ExcludedPaths) {
				delete(localScan, relPath)
			}
		}
		for relPath := range remoteByPath {
			if isExcluded(relPath, s.ExcludedPaths) {
				delete(remoteByPath, relPath)
			}
		}
	}

	// === DELETE PROPAGATION ===

	localPathSet := make(map[string]bool)
	for relPath := range localScan {
		localPathSet[relPath] = true
	}

	// 1. Local deletes → remote
	// NOTE: Remote delete propagation is currently disabled to prevent accidental
	// mass deletion of server data. Files deleted locally are ignored by the sync
	// engine and will re-download on the next sync. Re-enable by setting this to
	// true once a confirmation/threshold mechanism is in place.
	const propagateLocalDeletes = true

	// Track paths we've already deleted so duplicate state records don't
	// trigger repeated API calls for the same remote file.
	deletedPaths := make(map[string]bool)
	for objectID, stateRecord := range stateMap {
		if localPathSet[stateRecord.Path] {
			continue
		}
		if propagateLocalDeletes && remoteIDSet[objectID] {
			if !canUpload {
				s.status("Skipping remote delete for %s (no upload privileges)", stateRecord.Path)
				s.StateDB.DeleteFile(objectID)
				delete(stateMap, objectID)
				continue
			}
			if !deletedPaths[stateRecord.Path] {
				s.status("Deleting remote %s (deleted locally)...", stateRecord.Path)
				if err := s.ApiClient.DeleteObject(s.Workspace, objectID); err != nil {
					s.status("Warning: failed to delete remote %s: %v", stateRecord.Path, err)
					continue
				}
				deletedPaths[stateRecord.Path] = true
				// Remove from remoteByPath so the upload/download pass does not
				// treat this as a new remote file and immediately re-download it.
				delete(remoteByPath, stateRecord.Path)
				delete(remoteIDSet, objectID)
			}
		}
		s.StateDB.DeleteFile(objectID)
		delete(stateMap, objectID)
	}

	// 2. Remote deletes → local
	for objectID, stateRecord := range stateMap {
		if remoteIDSet[objectID] {
			continue
		}
		localFile, existsLocally := localScan[stateRecord.Path]
		if existsLocally && localFile.Checksum != stateRecord.Checksum {
			s.status("Conflict: %s deleted remotely but modified locally — keeping local copy", stateRecord.Path)
			s.StateDB.DeleteFile(objectID)
			delete(stateMap, objectID)
			continue
		}
		if existsLocally {
			s.status("Removing local %s (deleted remotely)...", stateRecord.Path)
			os.Remove(filepath.Join(s.LocalRoot, stateRecord.Path))
			delete(localScan, stateRecord.Path)
		}
		s.StateDB.DeleteFile(objectID)
		delete(stateMap, objectID)
	}

	// === UPLOAD / DOWNLOAD ===
	// Single unified pass: each file path is assigned to upload, download, conflict, or skip.
	// Upload and download are mutually exclusive per path to prevent race-condition corruption.

	var toUpload []ScannedFile
	var toDownload []api.TreeItem

	// Collect all paths seen in either local or remote.
	allPaths := make(map[string]bool, len(localScan)+len(remoteByPath))
	for relPath := range localScan {
		allPaths[relPath] = true
	}
	for relPath := range remoteByPath {
		allPaths[relPath] = true
	}

	for relPath := range allPaths {
		localFile, existsLocal := localScan[relPath]
		remoteItem, existsRemote := remoteByPath[relPath]

		if existsLocal && !existsRemote {
			// New local file — upload.
			if !canUpload {
				s.status("Skipping upload for %s (no upload privileges)", relPath)
				continue
			}
			toUpload = append(toUpload, localFile)
			continue
		}

		if !existsLocal && existsRemote {
			// New remote file — download.
			toDownload = append(toDownload, remoteItem)
			continue
		}

		// File exists in both places.
		remoteChecksumValid := isValidSHA256(remoteItem.Checksum)
		if remoteChecksumValid && remoteItem.Checksum == localFile.Checksum {
			// Checksums match — already in sync. Ensure state is recorded if missing.
			if _, hasState := stateMap[remoteItem.ID]; !hasState {
				s.StateDB.UpsertFile(state.LocalFile{
					ObjectID:   remoteItem.ID,
					Path:       relPath,
					Checksum:   remoteItem.Checksum,
					UpdatedAt:  remoteItem.UpdatedAt,
					LocalMtime: localFile.Mtime,
				})
			}
			continue
		}

		// If the remote has no valid checksum (absent, "ok", or other non-SHA256 value),
		// fall back to UpdatedAt-only tracking to avoid infinite re-downloads.
		if !remoteChecksumValid {
			stateRecord, hasState := stateMap[remoteItem.ID]
			if !hasState {
				// First sync of this file — record it as synced using the local checksum.
				s.StateDB.UpsertFile(state.LocalFile{
					ObjectID:   remoteItem.ID,
					Path:       relPath,
					Checksum:   localFile.Checksum,
					UpdatedAt:  remoteItem.UpdatedAt,
					LocalMtime: localFile.Mtime,
				})
				continue
			}
			// Re-download only if the remote was actually updated since we last synced.
			if remoteItem.UpdatedAt != stateRecord.UpdatedAt {
				toDownload = append(toDownload, remoteItem)
			}
			continue
		}

		// Checksums differ and remote has a valid SHA256 — decide direction.
		stateRecord, hasState := stateMap[remoteItem.ID]
		if !hasState {
			// Never synced before with conflicting content: server wins.
			// Save local copy as .conflict so no data is lost.
			conflictDest := filepath.Join(s.LocalRoot, relPath+".conflict")
			if err := os.Rename(filepath.Join(s.LocalRoot, relPath), conflictDest); err == nil {
				s.status("Conflict (first sync): %s — local copy saved as %s.conflict", relPath, relPath)
			}
			toDownload = append(toDownload, remoteItem)
			continue
		}

		localChanged := localFile.Mtime > stateRecord.LocalMtime
		remoteChanged := remoteItem.UpdatedAt != stateRecord.UpdatedAt

		switch {
		case localChanged && !remoteChanged:
			// Only local changed — upload.
			if !canUpload {
				s.status("Skipping upload for %s (no upload privileges)", relPath)
				continue
			}
			toUpload = append(toUpload, localFile)

		case !localChanged && remoteChanged:
			// Only remote changed — download.
			toDownload = append(toDownload, remoteItem)

		case localChanged && remoteChanged:
			// Both changed — conflict. Save local as .conflict, download server version.
			conflictDest := filepath.Join(s.LocalRoot, relPath+".conflict")
			if err := os.Rename(filepath.Join(s.LocalRoot, relPath), conflictDest); err == nil {
				s.status("Conflict: %s — local copy saved as %s.conflict, downloading server version", relPath, relPath)
				toDownload = append(toDownload, remoteItem)
			} else {
				s.status("Conflict: %s — could not save local copy, skipping", relPath)
			}

		default:
			// Neither changed but checksums differ — state DB is stale, re-download.
			toDownload = append(toDownload, remoteItem)
		}
	}

	// Ensure remote folders exist before parallel uploads
	for _, localFile := range toUpload {
		dir := filepath.ToSlash(filepath.Dir(localFile.RelativePath))
		if dir == "." || dir == "" {
			continue
		}

		parts := strings.Split(dir, "/")
		currentParentID := rootFolderID
		currentPath := ""

		for _, part := range parts {
			if currentPath == "" {
				currentPath = part
			} else {
				currentPath = currentPath + "/" + part
			}

			if existingID, ok := folderIDsByPath[currentPath]; ok {
				currentParentID = existingID
			} else {
				s.status("Creating remote folder %s...", currentPath)
				newID, err := s.ApiClient.CreateFolder(s.Workspace, currentParentID, part)
				if err != nil {
					return fmt.Errorf("failed to create remote folder %s: %w", currentPath, err)
				}
				folderIDsByPath[currentPath] = newID
				currentParentID = newID
			}
		}
	}

	g, _ := errgroup.WithContext(ctx)
	g.SetLimit(4)

	for _, item := range toDownload {
		item := item
		g.Go(func() error {
			s.status("Downloading %s...", item.Name)
			destPath := filepath.Join(s.LocalRoot, item.Name)
			if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
				return err
			}
			if err := s.ApiClient.DownloadFile(s.Workspace, item.ID, destPath); err != nil {
				return err
			}
			info, err := os.Stat(destPath)
			if err == nil {
				s.StateDB.DeleteFilesByPath(item.Name, item.ID)
				s.StateDB.UpsertFile(state.LocalFile{
					ObjectID:   item.ID,
					Path:       item.Name,
					Checksum:   item.Checksum,
					UpdatedAt:  item.UpdatedAt,
					LocalMtime: info.ModTime().Unix(),
				})
			}
			return nil
		})
	}

	for _, localFile := range toUpload {
		localFile := localFile
		g.Go(func() error {
			s.status("Uploading %s...", localFile.RelativePath)
			absPath := filepath.Join(s.LocalRoot, localFile.RelativePath)

			dir := filepath.ToSlash(filepath.Dir(localFile.RelativePath))
			parentID := rootFolderID
			if dir != "." && dir != "" {
				parentID = folderIDsByPath[dir]
			}
			baseName := filepath.Base(localFile.RelativePath)

			treeItem, err := s.ApiClient.UploadFile(s.Workspace, parentID, absPath, baseName, localFile.Checksum)
			if err != nil {
				return err
			}

			s.StateDB.DeleteFilesByPath(localFile.RelativePath, treeItem.ID)
			s.StateDB.UpsertFile(state.LocalFile{
				ObjectID:   treeItem.ID,
				Path:       localFile.RelativePath,
				Checksum:   localFile.Checksum,
				UpdatedAt:  treeItem.UpdatedAt,
				LocalMtime: localFile.Mtime,
			})
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return err
	}

	// === CLEANUP ORPHANED REMOTE FOLDERS ===
	// After uploads/downloads, remove remote folders that no longer exist locally.
	// Sort deepest-first so children are deleted before parents.
	if canUpload {
		localDirs := make(map[string]bool)
		for relPath := range localScan {
			dir := filepath.ToSlash(filepath.Dir(relPath))
			for dir != "." && dir != "" {
				localDirs[dir] = true
				dir = filepath.ToSlash(filepath.Dir(dir))
			}
		}
		// Also protect directories that were just downloaded — localScan was
		// taken before the sync ran, so newly-created download folders aren't
		// in it yet. Without this, the cleanup would try to delete them.
		for _, item := range toDownload {
			dir := filepath.ToSlash(filepath.Dir(item.Name))
			for dir != "." && dir != "" {
				localDirs[dir] = true
				dir = filepath.ToSlash(filepath.Dir(dir))
			}
		}

		type folderEntry struct{ path, id string }
		var orphans []folderEntry
		for path, id := range folderIDsByPath {
			if path == "" || path == "." {
				continue
			}
			if isExcluded(path, s.ExcludedPaths) {
				continue
			}
			if !localDirs[path] {
				orphans = append(orphans, folderEntry{path, id})
			}
		}

		sort.Slice(orphans, func(i, j int) bool {
			return strings.Count(orphans[i].path, "/") > strings.Count(orphans[j].path, "/")
		})

		for _, folder := range orphans {
			s.status("Removing empty remote folder %s...", folder.path)
			if err := s.ApiClient.DeleteObject(s.Workspace, folder.id); err != nil {
				s.status("Note: could not remove remote folder %s: %v", folder.path, err)
			}
		}
	}

	if len(toUpload) == 0 && len(toDownload) == 0 {
		s.status("Everything up to date.")
	} else {
		s.status("Sync complete (%d uploaded, %d downloaded).", len(toUpload), len(toDownload))
	}
	return nil
}
