package push

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/repository"
)

func Register(api *gin.RouterGroup, pushRepo *repository.PushSubscriptionRepository, vapidPublicKey string) {
	api.GET("/push/vapid-key", handleVAPIDKey(vapidPublicKey))
	api.POST("/push/subscribe", handleSubscribe(pushRepo))
	api.DELETE("/push/subscribe", handleUnsubscribe(pushRepo))
}
