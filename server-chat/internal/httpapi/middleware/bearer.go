package middleware

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"zync-server/internal/auth"
	"zync-server/internal/httpapi/response"
)

const ctxUserID = "authUserID"

// Bearer validates Authorization: Bearer JWT and stores user id in context.
func Bearer(s *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if len(h) < 8 || !strings.EqualFold(h[:7], "Bearer ") {
			response.Abort(c, http.StatusUnauthorized, response.CodeMissingAuthorization, "Authorization header must be Bearer <token>")
			return
		}
		token := strings.TrimSpace(h[7:])
		uid, err := s.ParseUserID(token)
		if err != nil {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Invalid or expired token")
			return
		}
		c.Set(ctxUserID, uid)
		c.Next()
	}
}

// UserID returns the authenticated user id set by Bearer (handlers under /api).
func UserID(c *gin.Context) (uint, bool) {
	v, ok := c.Get(ctxUserID)
	if !ok {
		return 0, false
	}
	id, ok := v.(uint)
	return id, ok
}

// FormatUserID matches WebSocket / message sender string format.
func FormatUserID(id uint) string {
	return strconv.FormatUint(uint64(id), 10)
}
