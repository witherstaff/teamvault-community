package api

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type WorkspaceStorage struct {
	LimitBytes     int64 `json:"limitBytes"`
	UsedBytes      int64 `json:"usedBytes"`
	AvailableBytes int64 `json:"availableBytes"`
}

type Workspace struct {
	ID        string           `json:"id"`
	Name      string           `json:"name"`
	Slug      string           `json:"slug"`
	Role      string           `json:"role"`
	CanUpload bool             `json:"canUpload"`
	Storage   WorkspaceStorage `json:"storage"`
}

func (c *Client) ListWorkspaces() ([]Workspace, error) {
	resp, err := c.DoAuthRequest(http.MethodGet, "/api/desktop/sync/workspaces", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to list workspaces, status: %d", resp.StatusCode)
	}

	var workspaces []Workspace
	if err := json.NewDecoder(resp.Body).Decode(&workspaces); err != nil {
		return nil, err
	}

	return workspaces, nil
}
