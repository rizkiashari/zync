package realtime

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/auth"
	"zync-server/internal/config"
	"zync-server/internal/hub"
	"zync-server/internal/repository"
)

// Register mounts WebSocket upgrade routes.
func Register(
	r gin.IRoutes,
	h *hub.Hub,
	msgRepo *repository.MessageRepository,
	roomsRepo *repository.RoomRepository,
	usersRepo *repository.UserRepository,
	wsRepo *repository.WorkspaceRepository,
	notifRepo *repository.NotificationRepository,
	pushRepo *repository.PushSubscriptionRepository,
	cfg *config.Config,
	jwtSvc *auth.Service,
	allowedOrigins []string,
) {
	r.GET("/ws", handleWebSocket(h, msgRepo, roomsRepo, usersRepo, wsRepo, notifRepo, pushRepo, cfg, jwtSvc, allowedOrigins))
	r.GET("/ws/notify", handleNotifyWS(h, usersRepo, jwtSvc, allowedOrigins))
}
