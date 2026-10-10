package engine

import (
	"context"
	"os"
	"path/filepath"
	"time"

	"github.com/fsnotify/fsnotify"
)

func Watch(ctx context.Context, syncer *Syncer, debounce, interval time.Duration) error {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	defer watcher.Close()

	if err := addDirsRecursively(watcher, syncer.LocalRoot); err != nil {
		return err
	}

	syncer.status("Watching %s...", syncer.LocalRoot)

	if err := syncer.Sync(ctx); err != nil {
		syncer.status("Initial sync error: %v", err)
	}
	syncer.watchIdle()

	debounceTimer := time.NewTimer(debounce)
	debounceTimer.Stop()

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil

		case event, ok := <-watcher.Events:
			if !ok {
				return nil
			}
			if event.Has(fsnotify.Create) {
				if info, err := os.Stat(event.Name); err == nil && info.IsDir() {
					_ = watcher.Add(event.Name)
				}
			}
			debounceTimer.Reset(debounce)

		case err, ok := <-watcher.Errors:
			if !ok {
				return nil
			}
			syncer.status("Watcher error: %v", err)

		case <-debounceTimer.C:
			syncer.status("Sync triggered by file change...")
			if err := syncer.Sync(ctx); err != nil {
				syncer.status("Sync error: %v", err)
			}
			syncer.watchIdle()

		case <-ticker.C:
			syncer.status("Periodic sync...")
			if err := syncer.Sync(ctx); err != nil {
				syncer.status("Sync error: %v", err)
			}
			syncer.watchIdle()
		}
	}
}

func addDirsRecursively(watcher *fsnotify.Watcher, root string) error {
	return filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			return watcher.Add(path)
		}
		return nil
	})
}
