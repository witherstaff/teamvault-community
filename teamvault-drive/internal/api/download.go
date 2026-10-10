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

// DownloadFile downloads objectID to localDest, resuming from a .part file if
// a previous attempt was interrupted. Retries up to maxTransferAttempts times
// on transient failures, getting a fresh presigned URL for each attempt.
func (c *Client) DownloadFile(workspaceID, objectID, localDest string) error {
	var lastErr error
	for attempt := 1; attempt <= maxTransferAttempts; attempt++ {
		err := c.downloadFileOnce(workspaceID, objectID, localDest)
		if err == nil {
			return nil
		}
		if isNonRetryable(err) {
			os.Remove(localDest + ".part")
			return err
		}
		lastErr = err
		if attempt < maxTransferAttempts {
			retryBackoff(attempt)
		}
	}
	os.Remove(localDest + ".part")
	return fmt.Errorf("download failed after %d attempts: %w", maxTransferAttempts, lastErr)
}

func (c *Client) downloadFileOnce(workspaceID, objectID, localDest string) error {
	partPath := localDest + ".part"

	// Check for an existing partial download to resume from.
	var offset int64
	if info, err := os.Stat(partPath); err == nil {
		offset = info.Size()
	}

	// Always get a fresh presigned URL — they expire after 2 minutes.
	downloadURL, err := c.getDownloadURL(workspaceID, objectID)
	if err != nil {
		return err
	}

	getReq, err := http.NewRequest(http.MethodGet, downloadURL, nil)
	if err != nil {
		return err
	}
	if offset > 0 {
		getReq.Header.Set("Range", fmt.Sprintf("bytes=%d-", offset))
	}

	getResp, err := c.HTTPClient.Do(getReq)
	if err != nil {
		return err
	}
	defer getResp.Body.Close()

	var outFile *os.File
	switch getResp.StatusCode {
	case http.StatusOK:
		// Server returned full content (range ignored or not supported) — start fresh.
		outFile, err = os.Create(partPath)
	case http.StatusPartialContent:
		// Server honoured the Range header — append to existing partial file.
		outFile, err = os.OpenFile(partPath, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0644)
	case http.StatusRequestedRangeNotSatisfiable:
		// Our offset is past the end of the file (e.g. file shrank) — delete and retry fresh.
		os.Remove(partPath)
		return fmt.Errorf("range not satisfiable, retrying from start")
	default:
		return &httpError{
			StatusCode: getResp.StatusCode,
			Message:    fmt.Sprintf("download failed for %s", localDest),
		}
	}

	if err != nil {
		return fmt.Errorf("could not open part file: %w", err)
	}

	if _, err := io.Copy(outFile, getResp.Body); err != nil {
		outFile.Close()
		return fmt.Errorf("write failed: %w", err)
	}
	outFile.Close()

	// Atomic rename: .part → final destination.
	return os.Rename(partPath, localDest)
}

func (c *Client) getDownloadURL(workspaceID, objectID string) (string, error) {
	reqBody := DownloadRequest{WorkspaceID: workspaceID, ObjectID: objectID}
	resp, err := c.DoAuthRequest(http.MethodPost, "/api/desktop/sync/download", reqBody)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", &httpError{StatusCode: resp.StatusCode, Message: "download URL request failed"}
	}

	var res DownloadResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}
	return res.DownloadURL, nil
}
