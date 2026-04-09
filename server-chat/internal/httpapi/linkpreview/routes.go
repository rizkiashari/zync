package linkpreview

import "github.com/gin-gonic/gin"

// Register mounts the link-preview endpoint.
func Register(g *gin.RouterGroup) {
	g.GET("/link-preview", getLinkPreview())
}
