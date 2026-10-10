package engine

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"desktop-client/internal/api"
	"desktop-client/internal/state"

	"golang.org/x/sync/errgroup"
)

type Syncer struct {
	ApiClient *api.Client
	StateDB   *state.DB
	LocalRoot string
	Workspace string
}

func NewSyncer(apiClient *api.Client, db *state.DB, root, workspace string) *Syncer {
	return &Syncer{
		ApiClient: apiClient,
		StateDB:   db,
		LocalRoot: root,
		Workspace: workspace,
	}
}

func (s *Syncer) Sync(ctx context.Context) error {
	fmt.Println("Scanning local directory...")
	localScan, err := ScanLocalDirectory(s.LocalRoot)
	if err != nil {
		return fmt.Errorf("local scan failed: %w", err)
	}

	fmt.Println("Fetching remote tree...")
	remoteTree, err := s.ApiClient.FetchTree(s.Workspace)
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

	// === DELETE PROPAGATION ===

	localPathSet := make(map[string]bool)
	for relPath := range localScan {
		localPathSet[relPath] = true
	}

	// 1. Local deletes → remote: files we tracked that are no longer on disk
	for objectID, stateRecord := range stateMap {
		if localPathSet[stateRecord.Path] {
			continue // still exists locally
		}
		if remoteIDSet[objectID] {
			fmt.Printf("Deleting remote %s (deleted locally)...\n", stateRecord.Path)
			if err := s.ApiClient.DeleteObject(s.Workspace, objectID); err != nil {
				fmt.Printf("Warning: failed to delete remote %s: %v\n", stateRecord.Path, err)
				continue // keep state entry, retry next sync
			}
		}
		s.StateDB.DeleteFile(objectID)
		delete(stateMap, objectID)
	}

	// 2. Remote deletes → local: files we tracked that no longer exist on the server
	for objectID, stateRecord := range stateMap {
		if remoteIDSet[objectID] {
			continue // still exists remotely
		}
		localFile, existsLocally := localScan[stateRecord.Path]
		if existsLocally && localFile.Checksum != stateRecord.Checksum {
			// Modified locally since last sync — conflict, local wins (will be uploaded as new)
			fmt.Printf("Conflict: %s deleted remotely but modified locally — keeping local copy\n", stateRecord.Path)
			s.StateDB.DeleteFile(objectID)
			delete(stateMap, objectID)
			continue
		}
		if existsLocally {
			fmt.Printf("Removing local %s (deleted remotely)...\n", stateRecord.Path)
			os.Remove(filepath.Join(s.LocalRoot, stateRecord.Path))
			delete(localScan, stateRecord.Path)
		}
		s.StateDB.DeleteFile(objectID)
		delete(stateMap, objectID)
	}

	// === UPLOAD / DOWNLOAD ===

	var toUpload []ScannedFile
	var toDownload []api.TreeItem

	for relPath, localFile := range localScan {
		remoteItem, existsRemote := remoteByPath[relPath]
		if !existsRemote {
			toUpload = append(toUpload, localFile)
		} else {
			if remoteItem.Checksum == localFile.Checksum {
				continue
			}
			stateRecord, hasState := stateMap[remoteItem.ID]
			if !hasState || localFile.Mtime > stateRecord.LocalMtime {
				toUpload = append(toUpload, localFile)
			}
		}
	}

	for relPath, remoteItem := range remoteByPath {
		localFile, existsLocal := localScan[relPath]
		if !existsLocal {
			toDownload = append(toDownload, remoteItem)
		} else {
			if remoteItem.Checksum == localFile.Checksum {
				continue
			}
			stateRecord, hasState := stateMap[remoteItem.ID]
			if hasState && remoteItem.UpdatedAt != stateRecord.UpdatedAt {
				toDownload = append(toDownload, remoteItem)
			}
		}
	}

	// Ensure all required remote directories exist before parallel uploads
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
				fmt.Printf("Creating remote folder %s...\n", currentPath)
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
			fmt.Printf("Downloading %s...\n", item.Name)
			destPath := filepath.Join(s.LocalRoot, item.Name)
			if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
				return err
			}
			if err := s.ApiClient.DownloadFile(s.Workspace, item.ID, destPath); err != nil {
				return err
			}
			info, err := os.Stat(destPath)
			if err == nil {
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
			fmt.Printf("Uploading %s...\n", localFile.RelativePath)
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

	if len(toUpload) == 0 && len(toDownload) == 0 {
		fmt.Println("Everything up to date.")
	} else {
		fmt.Printf("Sync complete (%d uploaded, %d downloaded).\n", len(toUpload), len(toDownload))
	}
	return nil
}
