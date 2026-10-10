package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type DownloadRequest struct {
	WorkspaceID string `json:"workspaceId"`
	ObjectID    string `json:"objectId"`
}

type DownloadResponse struct {
	DownloadURL string `json:"downloadUrl"`
}

func (c *Client) DownloadFile(workspaceID, objectID, localDest string) error {
	// 1. Get Presigned URL
	reqBody := DownloadRequest{
		WorkspaceID: workspaceID,
		ObjectID:    objectID,
	}

	resp, err := c.DoAuthRequest(http.MethodPost, "/api/desktop/sync/download", reqBody)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download init failed, status: %d", resp.StatusCode)
	}

	var res DownloadResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return err
	}

	// 2. GET from object storage
	getResp, err := c.HTTPClient.Get(res.DownloadURL)
	if err != nil {
		return err
	}
	defer getResp.Body.Close()

	if getResp.StatusCode != http.StatusOK {
		return fmt.Errorf("s3 download failed for %s, status: %d", localDest, getResp.StatusCode)
	}

	// 3. Write to file
	outFile, err := os.Create(localDest)
	if err != nil {
		return err
	}
	defer outFile.Close()

	_, err = io.Copy(outFile, getResp.Body)
	return err
}
