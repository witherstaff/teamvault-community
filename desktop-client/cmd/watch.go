package cmd

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"desktop-client/internal/engine"

	"github.com/spf13/cobra"
)

var watchWorkspace string
var watchInterval time.Duration
var watchDebounce time.Duration

var watchCmd = &cobra.Command{
	Use:   "watch [folder]",
	Short: "Watch a local folder and continuously sync with a TeamVault workspace",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		localFolder, err := filepath.Abs(args[0])
		if err != nil {
			fmt.Println(err)
			return
		}

		if watchWorkspace == "" {
			fmt.Println("Error: --workspace flag is required")
			fmt.Println("Run 'teamvault workspaces' to see available workspace IDs")
			return
		}

		syncer, db, err := buildSyncer(watchWorkspace, localFolder)
		if err != nil {
			fmt.Printf("Error: %v\n", err)
			return
		}
		defer db.Close()

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		// Graceful shutdown on SIGINT / SIGTERM
		sigs := make(chan os.Signal, 1)
		signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
		go func() {
			<-sigs
			fmt.Println("\nShutting down...")
			cancel()
		}()

		fmt.Printf("Watching workspace %s → %s\n", watchWorkspace, localFolder)

		if err := engine.Watch(ctx, syncer, watchDebounce, watchInterval); err != nil {
			fmt.Printf("Watch error: %v\n", err)
		}
	},
}

func init() {
	watchCmd.Flags().StringVarP(&watchWorkspace, "workspace", "w", "", "Workspace ID to sync")
	watchCmd.Flags().DurationVar(&watchInterval, "interval", 5*time.Minute, "Periodic sync interval")
	watchCmd.Flags().DurationVar(&watchDebounce, "debounce", 2*time.Second, "Debounce delay after file change")
	rootCmd.AddCommand(watchCmd)
}
