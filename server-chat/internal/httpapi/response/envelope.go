package response

// envelope is the canonical JSON shape for all HTTP API responses.
type envelope struct {
	Success bool        `json:"success"`
	Data    any         `json:"data,omitempty"`
	Error   *errPayload `json:"error,omitempty"`
}

type errPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
