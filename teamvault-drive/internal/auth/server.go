package auth

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"os/exec"
	"runtime"
)

type Config struct {
	Domain      string
	ClientID    string
	RedirectURI string
	Audience    string
}

func Login(cfg Config) error {
	verifier, challenge, err := GeneratePKCE()
	if err != nil {
		return err
	}

	codeChan := make(chan string)
	errChan := make(chan error)

	m := http.NewServeMux()
	m.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code == "" {
			errDesc := r.URL.Query().Get("error_description")
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusBadRequest)
			fmt.Fprintf(w, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>TeamVault Drive — Login Failed</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f1117;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #1a1d27;
      border: 1px solid #3d1f1f;
      border-radius: 16px;
      padding: 48px 56px;
      text-align: center;
      max-width: 420px;
      width: 100%%;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    }
    .icon {
      width: 64px; height: 64px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      border-radius: 50%%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg { width: 32px; height: 32px; fill: #fff; }
    h1 { font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 10px; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.6; }
    .err { margin-top: 16px; font-size: 13px; color: #f87171; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; padding: 10px 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </div>
    <h1>Login Failed</h1>
    <p>Something went wrong during authentication. Please try again from TeamVault Drive.</p>
    <div class="err">%s</div>
  </div>
</body>
</html>`, errDesc)
			errChan <- fmt.Errorf("login failed: %s", errDesc)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprint(w, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TeamVault Drive — Login Successful</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f1117;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #1a1d27;
      border: 1px solid #2d3148;
      border-radius: 16px;
      padding: 48px 56px;
      text-align: center;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    }
    .icon {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg { width: 32px; height: 32px; fill: #fff; }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 10px;
      letter-spacing: -0.3px;
    }
    p {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.6;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 28px;
      background: rgba(99,102,241,0.12);
      border: 1px solid rgba(99,102,241,0.3);
      color: #818cf8;
      font-size: 12px;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 999px;
    }
    .dot {
      width: 7px; height: 7px;
      background: #6366f1;
      border-radius: 50%;
      animation: pulse 1.6s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
      </svg>
    </div>
    <h1>Login Successful</h1>
    <p>You're now authenticated. You can close this window and return to TeamVault Drive.</p>
    <div class="badge">
      <span class="dot"></span>
      Syncing your workspace&hellip;
    </div>
  </div>
</body>
</html>`)
		codeChan <- code
	})

	srv := &http.Server{Addr: "127.0.0.1:8080", Handler: m}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()

	authURL := fmt.Sprintf(
		"https://%s/authorize?response_type=code&client_id=%s&code_challenge=%s&code_challenge_method=S256&redirect_uri=%s&scope=openid profile email offline_access&audience=%s",
		cfg.Domain, cfg.ClientID, challenge, url.QueryEscape(cfg.RedirectURI), url.QueryEscape(cfg.Audience),
	)

	if err := openBrowser(authURL); err != nil {
		fmt.Printf("Could not open browser automatically. Please visit:\n%s\n", authURL)
	}

	var code string
	select {
	case code = <-codeChan:
	case err := <-errChan:
		return err
	}

	srv.Shutdown(context.Background())

	token, err := ExchangeToken(cfg, code, verifier)
	if err != nil {
		return err
	}

	return SaveTokens(token.AccessToken, token.RefreshToken)
}

func openBrowser(url string) error {
	var err error
	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("unsupported platform")
	}
	return err
}
