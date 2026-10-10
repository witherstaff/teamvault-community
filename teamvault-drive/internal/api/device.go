package api

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type RegisterDeviceRequest struct {
	ClientID string `json:"clientId"`
	Name     string `json:"name"`
	Platform string `json:"platform"`
	Hostname string `json:"hostname"`
}

type RegisterDeviceResponse struct {
	DeviceID       string `json:"deviceId"`
	Name           string `json:"name"`
	RegisteredAt   string `json:"registeredAt"`
}

func (c *Client) RegisterDevice(req RegisterDeviceRequest) (*RegisterDeviceResponse, error) {
	resp, err := c.DoAuthRequest(http.MethodPost, "/api/desktop/sync/device/register", req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("device registration failed, status: %d", resp.StatusCode)
	}

	var res RegisterDeviceResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}
	return &res, nil
}
