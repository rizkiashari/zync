package push

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/repository"
)

type subscribeBody struct {
	Endpoint string `json:"endpoint" binding:"required"`
	P256DH   string `json:"p256dh"   binding:"required"`
	Auth     string `json:"auth"     binding:"required"`
}

type unsubscribeBody struct {
	Endpoint string `json:"endpoint" binding:"required"`
}

// handleSubscribe stores a Web Push subscription for the authenticated user.
func handleSubscribe(pushRepo *repository.PushSubscriptionRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		var req subscribeBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid subscription payload")
			return
		}
		if err := pushRepo.Upsert(userID, req.Endpoint, req.P256DH, req.Auth); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to save subscription")
			return
		}
		response.OK(c, gin.H{"message": "Subscribed"})
	}
}

// handleUnsubscribe removes a Web Push subscription.
func handleUnsubscribe(pushRepo *repository.PushSubscriptionRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		var req unsubscribeBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid payload")
			return
		}
		if err := pushRepo.Delete(userID, req.Endpoint); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to remove subscription")
			return
		}
		response.OK(c, gin.H{"message": "Unsubscribed"})
	}
}

// handleVAPIDKey returns the VAPID public key so the browser can subscribe.
func handleVAPIDKey(vapidPublicKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		response.OK(c, gin.H{"public_key": vapidPublicKey})
	}
}
