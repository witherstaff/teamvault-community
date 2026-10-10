package api

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type TreeItem struct {
	ID        string `json:"id"`
	ParentID  string `json:"parent_id"`
	Type      string `json:"type"`
	Name      string `json:"name"`
	Checksum  string `json:"checksum_sha256"`
	SizeBytes int64  `json:"size_bytes"`
	UpdatedAt string `json:"updated_at"`
}

func (c *Client) FetchTree(workspaceId string) ([]TreeItem, error) {
	path := fmt.Sprintf("/api/desktop/sync/tree?workspaceId=%s", workspaceId)
	resp, err := c.DoAuthRequest(http.MethodGet, path, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch tree, status code %d", resp.StatusCode)
	}

	var parsed struct {
		Objects []TreeItem `json:"objects"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}

	return parsed.Objects, nil
}
