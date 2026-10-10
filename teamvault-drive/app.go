package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	goruntime "runtime"
	"strings"
	"sync"
	"time"

	"teamvault-drive/internal/api"
	"teamvault-drive/internal/auth"
	"teamvault-drive/internal/engine"
	"teamvault-drive/internal/state"

	"github.com/google/uuid"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// --- Config ---

type WsConfig struct {
	LocalPath       string   `json:"local_path"`
	SyncEnabled     bool     `json:"sync_enabled"`
	ExcludedFolders []string `json:"excluded_folders,omitempty"`
	ScheduleMinutes int      `json:"schedule_minutes,omitempty"` // 0 = off
}

type Config struct {
	Auth0Domain      string              `json:"auth0_domain"`
	Auth0ClientID    string              `json:"auth0_client_id"`
	Auth0Audience    string              `json:"auth0_audience"`
	APIURL           string              `json:"api_url"`
	Workspaces       map[string]WsConfig `json:"workspaces"`
	ClientID         string              `json:"client_id"`         // stable UUID for this device
	DeviceID         string              `json:"device_id"`         // server-assigned UUID after registration
	DeviceName       string              `json:"device_name"`       // user-visible label
	MinimizeToTray   bool                `json:"minimize_to_tray"`  // hide to tray on minimize
}

// --- Log ---

const maxLogEntries = 500

type LogEntry struct {
	Time        string `json:"time"`
	WorkspaceID string `json:"workspaceId"`
	Message     string `json:"message"`
}

// --- Exposed types ---

type WorkspaceInfo struct {
	ID                  string `json:"id"`
	Name                string `json:"name"`
	Role                string `json:"role"`
	CanUpload           bool   `json:"canUpload"`
	LimitBytes          int64  `json:"limitBytes"`
	UsedBytes           int64  `json:"usedBytes"`
	LocalPath           string `json:"localPath"`
	SyncEnabled         bool   `json:"syncEnabled"`
	Watching            bool   `json:"watching"`
	ExcludedFolderCount int    `json:"excludedFolderCount"`
	ScheduleMinutes     int    `json:"scheduleMinutes"`
	IsScheduled         bool   `json:"isScheduled"`
}

// FolderNode is a node in the workspace folder tree used by the selective sync UI.
type FolderNode struct {
	ID       string       `json:"id"`
	Name     string       `json:"name"`
	Path     string       `json:"path"`
	Children []FolderNode `json:"children"`
}

type SyncStatusInfo struct {
	WorkspaceID string `json:"workspaceId"`
	State       string `json:"state"` // idle | syncing | watching | error
	Message     string `json:"message"`
}

// --- App ---

type App struct {
	ctx        context.Context
	config     *Config
	configPath string
	client     *api.Client

	mu               sync.Mutex
	syncStatus       map[string]*SyncStatusInfo
	watchCancels     map[string]context.CancelFunc
	scheduleCancels  map[string]context.CancelFunc
	syncLog          []LogEntry
}

func NewApp() *App {
	return &App{
		syncStatus:      make(map[string]*SyncStatusInfo),
		watchCancels:    make(map[string]context.CancelFunc),
		scheduleCancels: make(map[string]context.CancelFunc),
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.loadConfig()
	a.initClient()
	go a.runTray()
	// Re-start any scheduled syncs that were active before the app was closed.
	if a.IsLoggedIn() {
		a.startConfiguredSchedulers()
	}
}

func (a *App) loadConfig() {
	home, _ := os.UserHomeDir()
	a.configPath = home + "/.teamvault/drive-config.json"
	a.config = &Config{
		APIURL:        "https://teamvault.cloud",
		Auth0Domain:   "login.teamvault.cloud",
		Auth0ClientID: "Z0ElBquyi6iC2VNEAcTdxW9xlglHbh3E",
		Auth0Audience: "https://api.teamvault.cloud",
		Workspaces:    make(map[string]WsConfig),
	}

	data, err := os.ReadFile(a.configPath)
	if err != nil {
		return
	}
	_ = json.Unmarshal(data, a.config)
	if a.config.Workspaces == nil {
		a.config.Workspaces = make(map[string]WsConfig)
	}

	// Generate a stable client ID on first run.
	if a.config.ClientID == "" {
		a.config.ClientID = uuid.NewString()
		_ = a.saveConfig()
	}
	// Default device name to hostname.
	if a.config.DeviceName == "" {
		if h, err := os.Hostname(); err == nil {
			a.config.DeviceName = h
		} else {
			a.config.DeviceName = "TeamVault Drive"
		}
		_ = a.saveConfig()
	}
}

func (a *App) saveConfig() error {
	if err := os.MkdirAll(a.configPath[:len(a.configPath)-len("/drive-config.json")], 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(a.config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(a.configPath, data, 0600)
}

func (a *App) initClient() {
	authCfg := &auth.Config{
		Domain:      a.config.Auth0Domain,
		ClientID:    a.config.Auth0ClientID,
		Audience:    a.config.Auth0Audience,
		RedirectURI: "http://127.0.0.1:8080/callback",
	}
	a.client = api.NewClient(a.config.APIURL, authCfg)
}

// --- Auth ---

func (a *App) IsLoggedIn() bool {
	token, _, err := auth.GetTokens()
	return err == nil && token != ""
}

func (a *App) Login() error {
	if a.config.Auth0ClientID == "" {
		return fmt.Errorf("Auth0 Client ID not configured — please open Settings first")
	}
	cfg := auth.Config{
		Domain:      a.config.Auth0Domain,
		ClientID:    a.config.Auth0ClientID,
		Audience:    a.config.Auth0Audience,
		RedirectURI: "http://127.0.0.1:8080/callback",
	}
	if cfg.Domain == "" {
		cfg.Domain = "dev-5fwn6wmcmxs7pzxo.us.auth0.com"
	}
	if cfg.Audience == "" {
		cfg.Audience = "https://api.teamvault.cloud"
	}
	if err := auth.Login(cfg); err != nil {
		return err
	}
	a.registerDevice()
	a.startConfiguredSchedulers()
	return nil
}

// registerDevice calls the backend to register this device, storing the
// server-assigned device ID for use in audit events.
func (a *App) registerDevice() {
	hostname, _ := os.Hostname()
	res, err := a.client.RegisterDevice(api.RegisterDeviceRequest{
		ClientID: a.config.ClientID,
		Name:     a.config.DeviceName,
		Platform: goruntime.GOOS,
		Hostname: hostname,
	})
	if err != nil {
		fmt.Printf("Warning: device registration failed: %v\n", err)
		return
	}
	a.config.DeviceID = res.DeviceID
	_ = a.saveConfig()
}

// GetDeviceName returns the current device label.
func (a *App) GetDeviceName() string {
	return a.config.DeviceName
}

// SetDeviceName updates the device label and re-registers with the backend.
func (a *App) SetDeviceName(name string) error {
	if name == "" {
		return fmt.Errorf("device name cannot be empty")
	}
	a.config.DeviceName = name
	if err := a.saveConfig(); err != nil {
		return err
	}
	a.registerDevice()
	return nil
}

func (a *App) Logout() {
	auth.ClearTokens()
	a.mu.Lock()
	for id, cancel := range a.watchCancels {
		cancel()
		delete(a.watchCancels, id)
	}
	for id, cancel := range a.scheduleCancels {
		cancel()
		delete(a.scheduleCancels, id)
	}
	a.mu.Unlock()
}

// --- Workspaces ---

func (a *App) GetWorkspaces() ([]WorkspaceInfo, error) {
	workspaces, err := a.client.ListWorkspaces()
	if err != nil {
		return nil, err
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	result := make([]WorkspaceInfo, len(workspaces))
	for i, ws := range workspaces {
		wsConf := a.config.Workspaces[ws.ID]
		_, watching := a.watchCancels[ws.ID]
		_, scheduled := a.scheduleCancels[ws.ID]
		result[i] = WorkspaceInfo{
			ID:                  ws.ID,
			Name:                ws.Name,
			Role:                ws.Role,
			CanUpload:           ws.CanUpload,
			LimitBytes:          ws.Storage.LimitBytes,
			UsedBytes:           ws.Storage.UsedBytes,
			LocalPath:           wsConf.LocalPath,
			SyncEnabled:         wsConf.SyncEnabled,
			Watching:            watching,
			ExcludedFolderCount: len(wsConf.ExcludedFolders),
			ScheduleMinutes:     wsConf.ScheduleMinutes,
			IsScheduled:         scheduled,
		}
	}
	return result, nil
}

func (a *App) ChooseFolder(workspaceID string) (string, error) {
	path, err := wailsruntime.OpenDirectoryDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: "Choose sync folder",
	})
	if err != nil || path == "" {
		return "", err
	}

	a.mu.Lock()
	wsConf := a.config.Workspaces[workspaceID]
	wsConf.LocalPath = path
	wsConf.SyncEnabled = true
	a.config.Workspaces[workspaceID] = wsConf
	a.mu.Unlock()

	if err := a.saveConfig(); err != nil {
		return "", fmt.Errorf("failed to save config: %w", err)
	}
	return path, nil
}

// --- Sync ---

func (a *App) GetSyncStatus(workspaceID string) *SyncStatusInfo {
	a.mu.Lock()
	defer a.mu.Unlock()
	if s, ok := a.syncStatus[workspaceID]; ok {
		return s
	}
	return &SyncStatusInfo{WorkspaceID: workspaceID, State: "idle", Message: ""}
}

func (a *App) SyncNow(workspaceID string) error {
	a.mu.Lock()
	wsConf := a.config.Workspaces[workspaceID]
	a.mu.Unlock()

	if wsConf.LocalPath == "" {
		return fmt.Errorf("no local folder configured — click 'Choose Folder' first")
	}

	a.setStatus(workspaceID, "syncing", "Starting sync...")

	go func() {
		if err := a.runSync(workspaceID, wsConf.LocalPath); err != nil {
			a.setStatus(workspaceID, "error", err.Error())
		} else {
			a.setStatus(workspaceID, "idle", "Sync complete")
		}
	}()

	return nil
}

func (a *App) StartWatcher(workspaceID string) error {
	a.mu.Lock()
	_, already := a.watchCancels[workspaceID]
	wsConf := a.config.Workspaces[workspaceID]
	a.mu.Unlock()

	if already {
		return nil
	}
	if wsConf.LocalPath == "" {
		return fmt.Errorf("no local folder configured — click 'Choose Folder' first")
	}

	ctx, cancel := context.WithCancel(a.ctx)
	a.mu.Lock()
	a.watchCancels[workspaceID] = cancel
	a.mu.Unlock()

	go func() {
		defer func() {
			a.mu.Lock()
			delete(a.watchCancels, workspaceID)
			a.mu.Unlock()
			a.setStatus(workspaceID, "idle", "Watcher stopped")
		}()

		syncer, db, err := a.buildSyncer(workspaceID, wsConf.LocalPath)
		if err != nil {
			a.setStatus(workspaceID, "error", err.Error())
			return
		}
		defer db.Close()

		a.setStatus(workspaceID, "watching", "Watching for changes...")
		if err := engine.Watch(ctx, syncer, 2*time.Second, 5*time.Minute); err != nil {
			if ctx.Err() == nil {
				a.setStatus(workspaceID, "error", err.Error())
			}
		}
	}()

	return nil
}

func (a *App) StopWatcher(workspaceID string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if cancel, ok := a.watchCancels[workspaceID]; ok {
		cancel()
	}
}

func (a *App) IsWatching(workspaceID string) bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	_, ok := a.watchCancels[workspaceID]
	return ok
}

func (a *App) OpenFolder(workspaceID string) error {
	a.mu.Lock()
	wsConf := a.config.Workspaces[workspaceID]
	a.mu.Unlock()

	if wsConf.LocalPath == "" {
		return fmt.Errorf("no local folder configured")
	}

	switch goruntime.GOOS {
	case "windows":
		return exec.Command("explorer", wsConf.LocalPath).Start()
	case "darwin":
		return exec.Command("open", wsConf.LocalPath).Start()
	default:
		return exec.Command("xdg-open", wsConf.LocalPath).Start()
	}
}

// --- Settings ---

func (a *App) GetConfig() map[string]interface{} {
	return map[string]interface{}{
		"apiUrl":          a.config.APIURL,
		"auth0Domain":     a.config.Auth0Domain,
		"auth0ClientId":   a.config.Auth0ClientID,
		"auth0Audience":   a.config.Auth0Audience,
		"minimizeToTray":  a.config.MinimizeToTray,
	}
}

func (a *App) SaveSettings(apiURL, auth0Domain, auth0ClientID, auth0Audience string, minimizeToTray bool) error {
	a.config.APIURL = apiURL
	a.config.Auth0Domain = auth0Domain
	a.config.Auth0ClientID = auth0ClientID
	a.config.Auth0Audience = auth0Audience
	a.config.MinimizeToTray = minimizeToTray
	a.initClient()
	return a.saveConfig()
}

// --- Scheduled Sync ---

// SetScheduleInterval saves the sync interval for a workspace (0 = disabled)
// and immediately starts or stops the scheduler.
func (a *App) SetScheduleInterval(workspaceID string, minutes int) error {
	a.mu.Lock()
	wsConf := a.config.Workspaces[workspaceID]
	wsConf.ScheduleMinutes = minutes
	a.config.Workspaces[workspaceID] = wsConf
	a.mu.Unlock()

	if err := a.saveConfig(); err != nil {
		return err
	}

	// Restart the scheduler with the new interval (or stop it if 0).
	a.stopScheduler(workspaceID)
	if minutes > 0 {
		a.startScheduler(workspaceID, minutes)
	}
	return nil
}

// startScheduler launches a background goroutine that syncs workspaceID every
// intervalMinutes. Replaces any existing scheduler for that workspace.
func (a *App) startScheduler(workspaceID string, intervalMinutes int) {
	a.mu.Lock()
	wsConf := a.config.Workspaces[workspaceID]
	a.mu.Unlock()

	if wsConf.LocalPath == "" || intervalMinutes <= 0 {
		return
	}

	ctx, cancel := context.WithCancel(a.ctx)
	a.mu.Lock()
	a.scheduleCancels[workspaceID] = cancel
	a.mu.Unlock()

	go func() {
		defer func() {
			a.mu.Lock()
			delete(a.scheduleCancels, workspaceID)
			a.mu.Unlock()
		}()

		ticker := time.NewTicker(time.Duration(intervalMinutes) * time.Minute)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				a.mu.Lock()
				localPath := a.config.Workspaces[workspaceID].LocalPath
				a.mu.Unlock()
				if localPath == "" {
					return
				}
				if err := a.runSync(workspaceID, localPath); err != nil {
					a.setStatus(workspaceID, "error", fmt.Sprintf("Scheduled sync failed: %v", err))
				}
			}
		}
	}()
}

// stopScheduler cancels the scheduled sync for a workspace if one is running.
func (a *App) stopScheduler(workspaceID string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if cancel, ok := a.scheduleCancels[workspaceID]; ok {
		cancel()
	}
}

// startConfiguredSchedulers starts schedulers for all workspaces that have
// a non-zero interval configured. Called on startup and after login.
func (a *App) startConfiguredSchedulers() {
	a.mu.Lock()
	configs := make(map[string]WsConfig, len(a.config.Workspaces))
	for id, cfg := range a.config.Workspaces {
		configs[id] = cfg
	}
	a.mu.Unlock()

	for id, cfg := range configs {
		if cfg.ScheduleMinutes > 0 && cfg.LocalPath != "" {
			a.startScheduler(id, cfg.ScheduleMinutes)
		}
	}
}

// --- .tvignore ---

// GetTvIgnore returns the contents of .tvignore for a workspace's local folder.
// Returns an empty string if the file does not exist yet.
func (a *App) GetTvIgnore(workspaceID string) (string, error) {
	a.mu.Lock()
	wsConf := a.config.Workspaces[workspaceID]
	a.mu.Unlock()

	if wsConf.LocalPath == "" {
		return "", fmt.Errorf("no local folder configured for this workspace")
	}

	data, err := os.ReadFile(filepath.Join(wsConf.LocalPath, ".tvignore"))
	if os.IsNotExist(err) {
		return "", nil
	}
	return string(data), err
}

// SaveTvIgnore writes content to .tvignore in the workspace's local folder.
// Passing empty content deletes the file.
func (a *App) SaveTvIgnore(workspaceID, content string) error {
	a.mu.Lock()
	wsConf := a.config.Workspaces[workspaceID]
	a.mu.Unlock()

	if wsConf.LocalPath == "" {
		return fmt.Errorf("no local folder configured for this workspace")
	}

	path := filepath.Join(wsConf.LocalPath, ".tvignore")
	if strings.TrimSpace(content) == "" {
		err := os.Remove(path)
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	return os.WriteFile(path, []byte(content), 0644)
}

// --- Selective Sync ---

// GetFolderTree fetches the workspace's remote folder tree for the selective sync UI.
func (a *App) GetFolderTree(workspaceID string) ([]FolderNode, error) {
	items, _, err := a.client.FetchTree(workspaceID)
	if err != nil {
		return nil, err
	}
	return buildFolderTree(items), nil
}

// GetExcludedFolders returns the currently excluded folder paths for a workspace.
func (a *App) GetExcludedFolders(workspaceID string) []string {
	a.mu.Lock()
	defer a.mu.Unlock()
	excl := a.config.Workspaces[workspaceID].ExcludedFolders
	if excl == nil {
		return []string{}
	}
	return excl
}

// SetExcludedFolders saves the excluded folder paths for a workspace.
func (a *App) SetExcludedFolders(workspaceID string, excludedPaths []string) error {
	a.mu.Lock()
	wsConf := a.config.Workspaces[workspaceID]
	wsConf.ExcludedFolders = excludedPaths
	a.config.Workspaces[workspaceID] = wsConf
	a.mu.Unlock()
	return a.saveConfig()
}

// buildFolderTree converts a flat TreeItem slice into a nested FolderNode tree.
func buildFolderTree(items []api.TreeItem) []FolderNode {
	var rootID string
	for _, item := range items {
		if item.Type == "folder" && item.Name == "/" {
			rootID = item.ID
			break
		}
	}

	childrenOf := make(map[string][]api.TreeItem)
	for _, item := range items {
		if item.Type == "folder" && item.ID != rootID {
			childrenOf[item.ParentID] = append(childrenOf[item.ParentID], item)
		}
	}

	var build func(parentID, parentPath string) []FolderNode
	build = func(parentID, parentPath string) []FolderNode {
		var nodes []FolderNode
		for _, item := range childrenOf[parentID] {
			path := item.Name
			if parentPath != "" {
				path = parentPath + "/" + item.Name
			}
			nodes = append(nodes, FolderNode{
				ID:       item.ID,
				Name:     item.Name,
				Path:     path,
				Children: build(item.ID, path),
			})
		}
		return nodes
	}

	return build(rootID, "")
}

// --- Internal helpers ---

func (a *App) buildSyncer(workspaceID, localPath string) (*engine.Syncer, *state.DB, error) {
	home, _ := os.UserHomeDir()
	// Each workspace gets its own state DB so sync state is fully isolated.
	dbPath := home + "/.teamvault/sync-" + workspaceID + ".db"

	db, err := state.InitDB(dbPath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to init state db: %w", err)
	}

	a.mu.Lock()
	excluded := a.config.Workspaces[workspaceID].ExcludedFolders
	a.mu.Unlock()

	syncer := engine.NewSyncer(a.client, db, localPath, workspaceID, excluded)
	syncer.StatusCallback = func(msg string) {
		a.setStatus(workspaceID, "syncing", msg)
		a.appendLog(workspaceID, msg)
		if a.ctx != nil {
			wailsruntime.EventsEmit(a.ctx, "sync:progress", map[string]string{
				"workspaceId": workspaceID,
				"message":     msg,
			})
		}
	}
	syncer.WatchIdleCallback = func() {
		a.setStatus(workspaceID, "watching", "Watching for changes...")
	}
	return syncer, db, nil
}

func (a *App) runSync(workspaceID, localPath string) error {
	syncer, db, err := a.buildSyncer(workspaceID, localPath)
	if err != nil {
		return err
	}
	defer db.Close()

	if a.ctx != nil {
		wailsruntime.EventsEmit(a.ctx, "sync:started", map[string]string{"workspaceId": workspaceID})
	}

	if err := syncer.Sync(context.Background()); err != nil {
		a.appendLog(workspaceID, "ERROR: "+err.Error())
		if a.ctx != nil {
			wailsruntime.EventsEmit(a.ctx, "sync:error", map[string]string{
				"workspaceId": workspaceID,
				"error":       err.Error(),
			})
		}
		return err
	}

	if a.ctx != nil {
		wailsruntime.EventsEmit(a.ctx, "sync:completed", map[string]string{"workspaceId": workspaceID})
	}
	return nil
}

func (a *App) setStatus(workspaceID, st, message string) {
	a.mu.Lock()
	a.syncStatus[workspaceID] = &SyncStatusInfo{
		WorkspaceID: workspaceID,
		State:       st,
		Message:     message,
	}
	status := a.syncStatus[workspaceID]
	a.mu.Unlock()

	if a.ctx != nil {
		wailsruntime.EventsEmit(a.ctx, "sync:status", status)
	}
}

func (a *App) appendLog(workspaceID, message string) {
	entry := LogEntry{
		Time:        time.Now().Format("2006-01-02 15:04:05"),
		WorkspaceID: workspaceID,
		Message:     message,
	}
	a.mu.Lock()
	a.syncLog = append(a.syncLog, entry)
	if len(a.syncLog) > maxLogEntries {
		a.syncLog = a.syncLog[len(a.syncLog)-maxLogEntries:]
	}
	a.mu.Unlock()
}

// GetSyncLog returns all buffered log entries (most recent last).
func (a *App) GetSyncLog() []LogEntry {
	a.mu.Lock()
	defer a.mu.Unlock()
	out := make([]LogEntry, len(a.syncLog))
	copy(out, a.syncLog)
	return out
}

// ClearSyncLog empties the log buffer.
func (a *App) ClearSyncLog() {
	a.mu.Lock()
	a.syncLog = nil
	a.mu.Unlock()
}
