package auth

import "github.com/zalando/go-keyring"

const serviceName = "teamvault-sync"
const accessKey = "access_token"
const refreshKey = "refresh_token"

func SaveTokens(access, refresh string) error {
	if err := keyring.Set(serviceName, accessKey, access); err != nil {
		return err
	}
	if refresh != "" {
		if err := keyring.Set(serviceName, refreshKey, refresh); err != nil {
			return err
		}
	}
	return nil
}

func GetTokens() (string, string, error) {
	access, err := keyring.Get(serviceName, accessKey)
	if err != nil {
		return "", "", err
	}
	refresh, _ := keyring.Get(serviceName, refreshKey)
	return access, refresh, nil
}

func ClearTokens() error {
	keyring.Delete(serviceName, accessKey)
	keyring.Delete(serviceName, refreshKey)
	return nil
}
