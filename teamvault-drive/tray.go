package main

import (
	_ "embed"
	goruntime "runtime"
	"time"

	"github.com/energye/systray"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed build/trayicon.ico
var trayIcon []byte

func (a *App) runTray() {
	// Lock this goroutine to its OS thread so Windows delivers tray messages
	// (WM_LBUTTONUP, WM_RBUTTONUP, etc.) to the correct message pump.
	goruntime.LockOSThread()
	go a.watchMinimize()
	systray.Run(a.onTrayReady, nil)
}

func (a *App) watchMinimize() {
	ticker := time.NewTicker(300 * time.Millisecond)
	defer ticker.Stop()
	for range ticker.C {
		if a.ctx != nil && a.config != nil && a.config.MinimizeToTray && wailsruntime.WindowIsMinimised(a.ctx) {
			wailsruntime.WindowHide(a.ctx)
		}
	}
}

func (a *App) showWindow() {
	wailsruntime.WindowShow(a.ctx)
	wailsruntime.WindowUnminimise(a.ctx)
}

func (a *App) onTrayReady() {
	systray.SetIcon(trayIcon)
	systray.SetTooltip("TeamVault Drive")

	// Left-click on the icon opens the window directly.
	systray.SetOnClick(func(menu systray.IMenu) {
		a.showWindow()
	})

	open := systray.AddMenuItem("Open TeamVault Drive", "Show the TeamVault Drive window")
	open.Click(func() { a.showWindow() })

	systray.AddSeparator()

	quit := systray.AddMenuItem("Quit", "Quit TeamVault Drive")
	quit.Click(func() {
		systray.Quit()
		wailsruntime.Quit(a.ctx)
	})
}
