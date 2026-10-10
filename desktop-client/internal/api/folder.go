package api

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type CreateFolderRequest struct {
	WorkspaceID string `json:"workspaceId"`
	ParentID    string `json:"parentId"`
	Name        string `json:"name"`
}

type CreateFolderResponse struct {
	ID string `json:"id"`
}

func (c *Client) CreateFolder(workspaceID, parentID, name string) (string, error) {
	reqBody := CreateFolderRequest{
		WorkspaceID: workspaceID,
		ParentID:    parentID,
		Name:        name,
	}

	resp, err := c.DoAuthRequest(http.MethodPost, "/api/desktop/sync/mkdir", reqBody)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("failed to create folder, status: %d", resp.StatusCode)
	}

	var res CreateFolderResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}

	return res.ID, nil
}
