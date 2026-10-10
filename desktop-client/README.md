# TeamVault Desktop CLI Client

A headless, command-line synchronization client and background sync daemon for TeamVault, written in Go.

> 💡 **Looking for the graphical desktop application?**  
> If you want the GUI app with system tray and visual workspace manager, see **[`teamvault-drive/`](../teamvault-drive/)**.

---

## Features

- **Headless Operation**: Perfect for Linux servers, NAS appliances, CI/CD runners, and automated file pipelines.
- **Bi-directional Synchronization**: Syncs local directories with remote TeamVault workspaces.
- **File System Watching**: Real-time event monitoring with filesystem watchers.
- **OAuth / PKCE Login**: Interactive command-line authentication.

---

## Building from Source

Requires **Go 1.22+**:

```bash
cd desktop-client
go build -o teamvault main.go
```

---

## Command Reference

```bash
# 1. Log in to your TeamVault account
./teamvault login

# 2. List available workspaces
./teamvault workspaces

# 3. Perform a one-time synchronization
./teamvault sync --workspace <workspace-id> --dir /path/to/local/folder

# 4. Start background file watcher daemon
./teamvault watch --workspace <workspace-id> --dir /path/to/local/folder
```
