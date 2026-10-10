package cmd

import (
	"context"
	"fmt"
	"path/filepath"

	"github.com/spf13/cobra"
)

var syncWorkspace string

var syncCmd = &cobra.Command{
	Use:   "sync [folder]",
	Short: "Synchronize a local folder with a TeamVault workspace",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		localFolder, err := filepath.Abs(args[0])
		if err != nil {
			fmt.Println(err)
			return
		}

		if syncWorkspace == "" {
			fmt.Println("Error: --workspace flag is required")
			fmt.Println("Run 'teamvault workspaces' to see available workspace IDs")
			return
		}

		syncer, db, err := buildSyncer(syncWorkspace, localFolder)
		if err != nil {
			fmt.Printf("Error: %v\n", err)
			return
		}
		defer db.Close()

		fmt.Printf("Syncing workspace %s → %s\n", syncWorkspace, localFolder)
		if err := syncer.Sync(context.Background()); err != nil {
			fmt.Printf("Sync failed: %v\n", err)
		}
	},
}

func init() {
	syncCmd.Flags().StringVarP(&syncWorkspace, "workspace", "w", "", "Workspace ID to sync")
	rootCmd.AddCommand(syncCmd)
}
