package upload

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/repository"
)

// Register mounts the file upload route.
func Register(api *gin.RouterGroup, roomsRepo *repository.RoomRepository, uploadsDir string) {
	api.POST("/rooms/:id/upload", handleUpload(roomsRepo, uploadsDir))
}
