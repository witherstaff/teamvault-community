package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"desktop-client/internal/api"
	"desktop-client/internal/auth"
	"desktop-client/internal/engine"
	"desktop-client/internal/state"

	"github.com/spf13/viper"
)

func buildSyncer(workspace, localFolder string) (*engine.Syncer, *state.DB, error) {
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

	dbPath := stateFilePath("sync.db")
	db, err := state.InitDB(dbPath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to init state db: %w", err)
	}

	syncer := engine.NewSyncer(client, db, localFolder, workspace)
	return syncer, db, nil
}

func stateFilePath(filename string) string {
	home := os.Getenv("USERPROFILE")
	if home == "" {
		home = os.Getenv("HOME")
	}
	if home == "" {
		home, _ = os.UserHomeDir()
	}
	return filepath.Join(home, ".teamvault", filename)
}
