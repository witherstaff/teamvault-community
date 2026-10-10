package api

import (
	"fmt"
	"net/http"
)

type DeleteRequest struct {
	WorkspaceID string `json:"workspaceId"`
	ObjectID    string `json:"objectId"`
}

func (c *Client) DeleteObject(workspaceID, objectID string) error {
	resp, err := c.DoAuthRequest(http.MethodPost, "/api/desktop/sync/delete", DeleteRequest{
		WorkspaceID: workspaceID,
		ObjectID:    objectID,
	})
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("delete failed, status: %d", resp.StatusCode)
	}

	return nil
}
