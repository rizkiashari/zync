package calls

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/config"
	"zync-server/internal/hub"
	"zync-server/internal/repository"
)

func Register(api *gin.RouterGroup, h *hub.Hub, roomsRepo *repository.RoomRepository, usersRepo *repository.UserRepository, cfg *config.Config) {
	ct := newCallTracker()
	api.POST("/rooms/:id/call/token", handleToken(roomsRepo, usersRepo, cfg))
	api.POST("/rooms/:id/call/start", handleStart(h, roomsRepo, ct))
	api.POST("/rooms/:id/call/end", handleEnd(h, roomsRepo, ct))
}
