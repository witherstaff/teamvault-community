package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
)

// GeneratePKCE creates a secure random code verifier and its SHA-256 base64url encoded challenge
func GeneratePKCE() (string, string, error) {
	// 32 bytes gives a base64url string of length 43, which is within the 43-128 requirement
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}
	verifier := base64.RawURLEncoding.EncodeToString(b)

	h := sha256.New()
	h.Write([]byte(verifier))
	challenge := base64.RawURLEncoding.EncodeToString(h.Sum(nil))

	return verifier, challenge, nil
}
