package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/response"
	"zync-server/internal/repository"
)

// SystemAdmin allows only users with IsSystemAdmin (after Bearer auth).
func SystemAdmin(users *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		u, err := users.GetByID(id)
		if err != nil || u == nil || !u.IsSystemAdmin {
			response.Abort(c, http.StatusForbidden, response.CodeForbidden, "System admin only")
			return
		}
		c.Next()
	}
}
