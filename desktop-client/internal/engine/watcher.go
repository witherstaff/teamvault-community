package engine

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/fsnotify/fsnotify"
)

// Watch runs an initial sync then watches localRoot for changes, re-syncing
// after a debounce period. It also re-syncs on the given periodic interval.
// Blocks until ctx is cancelled.
func Watch(ctx context.Context, syncer *Syncer, debounce, interval time.Duration) error {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return fmt.Errorf("failed to create file watcher: %w", err)
	}
	defer watcher.Close()

	if err := addDirsRecursively(watcher, syncer.LocalRoot); err != nil {
		return fmt.Errorf("failed to watch directory: %w", err)
	}

	fmt.Printf("Watching %s (debounce: %s, interval: %s)\n", syncer.LocalRoot, debounce, interval)

	// Initial sync
	if err := syncer.Sync(ctx); err != nil {
		fmt.Printf("Initial sync error: %v\n", err)
	}

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
			// If a new directory was created, watch it too
			if event.Has(fsnotify.Create) {
				if info, err := os.Stat(event.Name); err == nil && info.IsDir() {
					_ = watcher.Add(event.Name)
				}
			}
			// Reset debounce timer on any event
			debounceTimer.Reset(debounce)

		case err, ok := <-watcher.Errors:
			if !ok {
				return nil
			}
			fmt.Printf("Watcher error: %v\n", err)

		case <-debounceTimer.C:
			fmt.Println("Sync triggered by file change...")
			if err := syncer.Sync(ctx); err != nil {
				fmt.Printf("Sync error: %v\n", err)
			}

		case <-ticker.C:
			fmt.Println("Sync triggered by interval...")
			if err := syncer.Sync(ctx); err != nil {
				fmt.Printf("Sync error: %v\n", err)
			}
		}
	}
}

func addDirsRecursively(watcher *fsnotify.Watcher, root string) error {
	return filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // skip unreadable entries
		}
		if info.IsDir() {
			return watcher.Add(path)
		}
		return nil
	})
}
