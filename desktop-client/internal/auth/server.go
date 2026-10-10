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
			fmt.Fprintf(w, "Login failed: %s", errDesc)
			errChan <- fmt.Errorf("login failed: %s", errDesc)
			return
		}
		fmt.Fprintf(w, "Login successful! You may close this window and return to the terminal.")
		codeChan <- code
	})

	srv := &http.Server{Addr: "127.0.0.1:8080", Handler: m}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()

	authURL := fmt.Sprintf("https://%s/authorize?response_type=code&client_id=%s&code_challenge=%s&code_challenge_method=S256&redirect_uri=%s&scope=openid profile email offline_access&audience=%s",
		cfg.Domain, cfg.ClientID, challenge, url.QueryEscape(cfg.RedirectURI), url.QueryEscape(cfg.Audience))

	fmt.Printf("Opening browser to authenticate...\nIf it doesn't open automatically, please visit:\n%s\n", authURL)

	if err := openBrowser(authURL); err != nil {
		fmt.Printf("Could not open browser automatically: %v\n", err)
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
