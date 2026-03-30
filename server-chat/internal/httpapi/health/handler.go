package health

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/response"
)

// Health godoc
// @Summary Liveness / readiness
// @Description Returns service status.
// @Tags health
// @Produce json
// @Success 200 {object} apidocs.HealthResponse
// @Router /health [get]
func handle(c *gin.Context) {
	response.OK(c, gin.H{"status": "ok"})
}
