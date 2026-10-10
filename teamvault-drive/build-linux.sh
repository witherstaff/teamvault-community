#!/bin/bash
set -e

echo "=== Installing Go ==="
wget -q https://go.dev/dl/go1.24.1.linux-amd64.tar.gz -O /tmp/go.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf /tmp/go.tar.gz
export PATH=$PATH:/usr/local/go/bin
echo "Go: $(go version)"

echo "=== Installing system deps ==="
sudo apt-get update -qq
sudo apt-get install -y -qq libgtk-3-dev libwebkit2gtk-4.0-dev pkg-config build-essential libayatana-appindicator3-dev

echo "=== Installing Wails ==="
go install github.com/wailsapp/wails/v2/cmd/wails@v2.11.0
export PATH=$PATH:$HOME/go/bin

echo "=== Building ==="
cd /mnt/c/Users/kpitc/OneDrive/Documents/teamvault/source/teamvault-drive
wails build -platform linux/amd64 -o teamvault-drive-linux

echo "=== Done ==="
ls -lh build/bin/teamvault-drive-linux
