package cmd

import (
	"fmt"

	"desktop-client/internal/api"
	"desktop-client/internal/auth"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var workspacesCmd = &cobra.Command{
	Use:   "workspaces",
	Short: "List available TeamVault workspaces",
	Run: func(cmd *cobra.Command, args []string) {
		apiURL := viper.GetString("api_url")
		if apiURL == "" {
			apiURL = "http://localhost:3000"
		}

		authCfg := &auth.Config{
			Domain:      viper.GetString("auth0_domain"),
			ClientID:    viper.GetString("auth0_client_id"),
			Audience:    viper.GetString("auth0_audience"),
			RedirectURI: "http://127.0.0.1:8080/callback",
		}

		client := api.NewClient(apiURL, authCfg)

		workspaces, err := client.ListWorkspaces()
		if err != nil {
			fmt.Printf("Error listing workspaces: %v\n", err)
			return
		}

		if len(workspaces) == 0 {
			fmt.Println("No workspaces found.")
			return
		}

		fmt.Printf("%-36s  %-24s  %-6s  %s\n", "ID", "Name", "Role", "Storage")
		fmt.Printf("%-36s  %-24s  %-6s  %s\n", "------------------------------------", "------------------------", "------", "-------")
		for _, ws := range workspaces {
			usedGB := float64(ws.Storage.UsedBytes) / 1e9
			limitGB := float64(ws.Storage.LimitBytes) / 1e9
			fmt.Printf("%-36s  %-24s  %-6s  %.1f / %.0f GB\n",
				ws.ID, ws.Name, ws.Role, usedGB, limitGB)
		}

		fmt.Printf("\nUsage: teamvault sync --workspace <ID> <folder>\n")
	},
}

func init() {
	rootCmd.AddCommand(workspacesCmd)
}
