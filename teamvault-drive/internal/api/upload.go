package api

import (
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// knownMime supplements mime.TypeByExtension for types that may not be
// registered in the OS MIME database (common on minimal Windows installs).
var knownMime = map[string]string{
	".pdf":  "application/pdf",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".png":  "image/png",
	".gif":  "image/gif",
	".webp": "image/webp",
	".svg":  "image/svg+xml",
	".mp4":  "video/mp4",
	".mov":  "video/quicktime",
	".avi":  "video/x-msvideo",
	".mkv":  "video/x-matroska",
	".mp3":  "audio/mpeg",
	".wav":  "audio/wav",
	".ogg":  "audio/ogg",
	".txt":  "text/plain",
	".md":   "text/markdown",
	".csv":  "text/csv",
	".json": "application/json",
	".xml":  "application/xml",
	".zip":  "application/zip",
	".epub": "application/epub+zip",
	".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	".doc":  "application/msword",
	".xls":  "application/vnd.ms-excel",
	".ppt":  "application/vnd.ms-powerpoint",
}

// detectMimeType returns the MIME type for a file, using (in order):
// 1. A known-extensions map
// 2. Go's mime.TypeByExtension (OS-registered types)
// 3. Content sniffing (first 512 bytes)
// 4. "application/octet-stream" as a final fallback
func detectMimeType(localPath string) string {
	ext := strings.ToLower(filepath.Ext(localPath))
	if t, ok := knownMime[ext]; ok {
		return t
	}
	if t := mime.TypeByExtension(ext); t != "" {
		// Strip any parameters (e.g. "; charset=utf-8") for storage
		if idx := strings.Index(t, ";"); idx != -1 {
			t = strings.TrimSpace(t[:idx])
		}
		return t
	}
	// Fall back to reading the first 512 bytes for content sniffing
	f, err := os.Open(localPath)
	if err == nil {
		defer f.Close()
		buf := make([]byte, 512)
		n, _ := io.ReadFull(f, buf)
		if n > 0 {
			return http.DetectContentType(buf[:n])
		}
	}
	return "application/octet-stream"
}

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

type UploadCompleteResponse struct {
	File TreeItem `json:"file"`
}

// UploadFile uploads localPath to the server, retrying up to maxTransferAttempts
// times on transient failures. Non-retryable errors (quota, auth, permissions)
// are returned immediately. Each attempt gets a fresh presigned URL from init.
func (c *Client) UploadFile(workspaceID, parentID, localPath, fileName, checksum string) (*TreeItem, error) {
	var lastErr error
	for attempt := 1; attempt <= maxTransferAttempts; attempt++ {
		result, err := c.uploadFileOnce(workspaceID, parentID, localPath, fileName, checksum)
		if err == nil {
			return result, nil
		}
		if isNonRetryable(err) {
			return nil, err
		}
		lastErr = err
		if attempt < maxTransferAttempts {
			retryBackoff(attempt)
		}
	}
	return nil, fmt.Errorf("upload failed after %d attempts: %w", maxTransferAttempts, lastErr)
}

func (c *Client) uploadFileOnce(workspaceID, parentID, localPath, fileName, checksum string) (*TreeItem, error) {
	fileInfo, err := os.Stat(localPath)
	if err != nil {
		return nil, err
	}

	// Step 1: init — get a fresh presigned PUT URL and a new objectId.
	initReq := UploadInitRequest{
		WorkspaceID:    workspaceID,
		ParentID:       parentID,
		Name:           fileName,
		SizeBytes:      fileInfo.Size(),
		MimeType:       detectMimeType(localPath),
		ChecksumSha256: checksum,
	}

	resp, err := c.DoAuthRequest(http.MethodPost, "/api/desktop/sync/upload/init", initReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, &httpError{StatusCode: resp.StatusCode, Message: "upload init failed"}
	}

	var initRes UploadInitResponse
	if err := json.NewDecoder(resp.Body).Decode(&initRes); err != nil {
		return nil, err
	}

	// Step 2: PUT file body directly to object storage.
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
	putReq.ContentLength = fileInfo.Size()

	putResp, err := c.HTTPClient.Do(putReq)
	if err != nil {
		return nil, err
	}
	defer putResp.Body.Close()

	if putResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("storage PUT failed, status: %d", putResp.StatusCode)
	}

	// Step 3: complete — register the file in the database.
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
		return nil, &httpError{StatusCode: compResp.StatusCode, Message: "upload complete failed"}
	}

	var compRes UploadCompleteResponse
	if err := json.NewDecoder(compResp.Body).Decode(&compRes); err != nil {
		return nil, err
	}

	return &compRes.File, nil
}
