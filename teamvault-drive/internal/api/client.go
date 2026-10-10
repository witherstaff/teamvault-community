package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"teamvault-drive/internal/auth"
)

type Client struct {
	BaseURL    string
	HTTPClient *http.Client
	AuthConfig *auth.Config
}

func NewClient(baseURL string, authCfg *auth.Config) *Client {
	return &Client{
		BaseURL:    baseURL,
		HTTPClient: &http.Client{},
		AuthConfig: authCfg,
	}
}

func (c *Client) DoAuthRequest(method, path string, body interface{}) (*http.Response, error) {
	accessToken, _, err := auth.GetTokens()
	if err != nil {
		return nil, fmt.Errorf("could not get access token: %v. Please log in first", err)
	}

	resp, err := c.doRequest(method, path, body, accessToken)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode == http.StatusUnauthorized {
		resp.Body.Close()

		newToken, err := c.tryRefresh()
		if err != nil {
			return nil, fmt.Errorf("session expired and refresh failed: %v. Please log in again", err)
		}

		return c.doRequest(method, path, body, newToken)
	}

	return resp, nil
}

func (c *Client) doRequest(method, path string, body interface{}, accessToken string) (*http.Response, error) {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, reqBody)
	if err != nil {
		return nil, err
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	return c.HTTPClient.Do(req)
}

func (c *Client) tryRefresh() (string, error) {
	if c.AuthConfig == nil {
		return "", fmt.Errorf("no auth config available for refresh")
	}

	_, refreshToken, err := auth.GetTokens()
	if err != nil || refreshToken == "" {
		return "", fmt.Errorf("no refresh token available")
	}

	tokens, err := auth.RefreshTokens(*c.AuthConfig, refreshToken)
	if err != nil {
		return "", err
	}

	if err := auth.SaveTokens(tokens.AccessToken, tokens.RefreshToken); err != nil {
		return "", fmt.Errorf("failed to save refreshed tokens: %w", err)
	}

	return tokens.AccessToken, nil
}
