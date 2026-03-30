package dashboard

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/repository"
)

// Register mounts the dashboard route under api (group should already use auth middleware).
func Register(api *gin.RouterGroup, roomsRepo *repository.RoomRepository, usersRepo *repository.UserRepository) {
	api.GET("/dashboard", handleDashboard(roomsRepo, usersRepo))
}
