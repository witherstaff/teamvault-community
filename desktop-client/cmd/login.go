package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"desktop-client/internal/auth"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Log in to TeamVault",
	Run: func(cmd *cobra.Command, args []string) {
		cfg := auth.Config{
			Domain:      viper.GetString("auth0_domain"),
			ClientID:    viper.GetString("auth0_client_id"),
			RedirectURI: "http://127.0.0.1:8080/callback",
			Audience:    viper.GetString("auth0_audience"),
		}
		if cfg.Domain == "" {
			cfg.Domain = "dev-5fwn6wmcmxs7pzxo.us.auth0.com"
		}
		if cfg.ClientID == "" {
			fmt.Println("Error: TEAMVAULT_AUTH0_CLIENT_ID environment variable is missing.")
			fmt.Println("Please create a 'Native' application in your Auth0 tenant and provide its Client ID.")
			os.Exit(1)
		}
		if cfg.Audience == "" {
			cfg.Audience = "https://api.teamvault.cloud"
		}

		fmt.Println("Starting login process...")
		err := auth.Login(cfg)
		if err != nil {
			fmt.Printf("Login failed: %v\n", err)
			return
		}

		// Persist auth config so token refresh works without env vars
		viper.Set("auth0_domain", cfg.Domain)
		viper.Set("auth0_client_id", cfg.ClientID)
		viper.Set("auth0_audience", cfg.Audience)
		if viper.ConfigFileUsed() != "" {
			_ = viper.WriteConfig()
		} else {
			home, _ := os.UserHomeDir()
			_ = viper.WriteConfigAs(filepath.Join(home, ".teamvault.yaml"))
		}

		fmt.Println("Successfully logged in and saved tokens.")
	},
}

func init() {
	rootCmd.AddCommand(loginCmd)
}
