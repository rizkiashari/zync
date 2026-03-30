package notifications

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/repository"
)

func Register(api *gin.RouterGroup, notifRepo *repository.NotificationRepository) {
	api.GET("/notifications", handleList(notifRepo))
	api.PUT("/notifications/read", handleMarkAllRead(notifRepo))
	api.PUT("/notifications/:id/read", handleMarkRead(notifRepo))
}
