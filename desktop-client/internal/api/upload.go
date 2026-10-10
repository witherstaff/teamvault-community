package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type UploadInitRequest struct {
	WorkspaceID    string `json:"workspaceId"`
	ParentID       string `json:"parentId"`
	Name           string `json:"name"`
	SizeBytes      int64  `json:"sizeBytes"`
	MimeType       string `json:"mimeType"`
	ChecksumSha256 string `json:"checksumSha256"`
}

type UploadInitResponse struct {
	UploadURL  string `json:"uploadUrl"`
	ObjectID   string `json:"objectId"`
	StorageKey string `json:"storageKey"`
}

type UploadCompleteResponse struct {
	File TreeItem `json:"file"`
}

type UploadCompleteRequest struct {
	WorkspaceID    string `json:"workspaceId"`
	ParentID       string `json:"parentId"`
	Name           string `json:"name"`
	MimeType       string `json:"mimeType"`
	ChecksumSha256 string `json:"checksumSha256"`
	ObjectID       string `json:"objectId"`
	StorageKey     string `json:"storageKey"`
	SizeBytes      int64  `json:"sizeBytes"`
}

func (c *Client) UploadFile(workspaceID, parentID, localPath, fileName, checksum string) (*TreeItem, error) {
	fileInfo, err := os.Stat(localPath)
	if err != nil {
		return nil, err
	}

	// 1. Init
	initReq := UploadInitRequest{
		WorkspaceID:    workspaceID,
		ParentID:       parentID,
		Name:           fileName,
		SizeBytes:      fileInfo.Size(),
		MimeType:       "application/octet-stream",
		ChecksumSha256: checksum,
	}

	resp, err := c.DoAuthRequest(http.MethodPost, "/api/desktop/sync/upload/init", initReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("init failed, status: %d", resp.StatusCode)
	}

	var initRes UploadInitResponse
	if err := json.NewDecoder(resp.Body).Decode(&initRes); err != nil {
		return nil, err
	}

	// 2. PUT to object storage
	file, err := os.Open(localPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	putReq, err := http.NewRequest(http.MethodPut, initRes.UploadURL, file)
	if err != nil {
		return nil, err
	}
	putReq.Header.Set("Content-Type", initReq.MimeType)
	putReq.Header.Set("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))
	putReq.ContentLength = fileInfo.Size() // Must explicitly set the property for Go's http client to send it

	putResp, err := c.HTTPClient.Do(putReq)
	if err != nil {
		return nil, err
	}
	defer putResp.Body.Close()

	if putResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("s3 upload failed, status: %d", putResp.StatusCode)
	}

	// 3. Complete
	compReq := UploadCompleteRequest{
		WorkspaceID:    workspaceID,
		ParentID:       parentID,
		Name:           fileName,
		MimeType:       initReq.MimeType,
		ChecksumSha256: initReq.ChecksumSha256,
		ObjectID:       initRes.ObjectID,
		StorageKey:     initRes.StorageKey,
		SizeBytes:      fileInfo.Size(),
	}

	compResp, err := c.DoAuthRequest(http.MethodPost, "/api/desktop/sync/upload/complete", compReq)
	if err != nil {
		return nil, err
	}
	defer compResp.Body.Close()

	if compResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("complete failed, status: %d", compResp.StatusCode)
	}

	var compRes UploadCompleteResponse
	if err := json.NewDecoder(compResp.Body).Decode(&compRes); err != nil {
		return nil, err
	}

	return &compRes.File, nil
}
