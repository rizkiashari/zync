package realtime

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/response"
)

func tokenFromRequest(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if len(h) >= 7 && strings.EqualFold(h[:7], "Bearer ") {
		return strings.TrimSpace(h[7:])
	}
	return r.URL.Query().Get("token")
}

func abortUnauthorized(c *gin.Context) {
	response.Abort(c, http.StatusUnauthorized, response.CodeUnauthorized, "Valid JWT required (Bearer header or token query)")
}
