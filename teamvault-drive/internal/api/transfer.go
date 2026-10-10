package api

import (
	"errors"
	"fmt"
	"time"
)

const maxTransferAttempts = 3

// httpError wraps an HTTP status code so callers can distinguish
// retryable network failures from non-retryable server responses.
type httpError struct {
	StatusCode int
	Message    string
}

func (e *httpError) Error() string {
	return fmt.Sprintf("HTTP %d: %s", e.StatusCode, e.Message)
}

// isNonRetryable returns true for errors that should not be retried:
// 4xx client errors (except 429 Too Many Requests which is rate-limiting).
func isNonRetryable(err error) bool {
	var he *httpError
	if errors.As(err, &he) {
		return he.StatusCode >= 400 && he.StatusCode < 500 && he.StatusCode != 429
	}
	return false
}

// retryBackoff sleeps for attempt² seconds (1s, 4s, 9s, …).
func retryBackoff(attempt int) {
	time.Sleep(time.Duration(attempt*attempt) * time.Second)
}
