package health

import "github.com/gin-gonic/gin"

// Register mounts health check routes on r.
func Register(r gin.IRoutes) {
	r.GET("/health", handle)
}
