package realtime

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/auth"
	"zync-server/internal/hub"
	"zync-server/internal/repository"
)

// Register mounts WebSocket upgrade routes.
func Register(r gin.IRoutes, h *hub.Hub, msgRepo *repository.MessageRepository, roomsRepo *repository.RoomRepository, usersRepo *repository.UserRepository, jwtSvc *auth.Service, allowedOrigins []string) {
	r.GET("/ws", handleWebSocket(h, msgRepo, roomsRepo, usersRepo, jwtSvc, allowedOrigins))
	r.GET("/ws/notify", handleNotifyWS(h, jwtSvc, allowedOrigins))
}
