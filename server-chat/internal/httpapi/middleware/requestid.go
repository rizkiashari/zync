package middleware

import (
	"crypto/rand"
	"encoding/hex"

	"github.com/gin-gonic/gin"
)

const ctxRequestID = "request_id"

// RequestID generates a unique X-Request-ID for every incoming request and
// stores it in the Gin context under key "request_id".
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader("X-Request-ID")
		if id == "" {
			b := make([]byte, 8)
			_, _ = rand.Read(b)
			id = hex.EncodeToString(b)
		}
		c.Set(ctxRequestID, id)
		c.Header("X-Request-ID", id)
		c.Next()
	}
}

// GetRequestID returns the request ID stored in the context.
func GetRequestID(c *gin.Context) string {
	v, _ := c.Get(ctxRequestID)
	s, _ := v.(string)
	return s
}
