package admin

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/repository"
)

// Register mounts system-admin-only routes (caller must add SystemAdmin middleware).
func Register(g *gin.RouterGroup, usersRepo *repository.UserRepository, subRepo *repository.SubscriptionRepository) {
	g.GET("/users", handleListUsers(usersRepo))
	g.GET("/users/:id", handleGetUser(usersRepo))
	g.PUT("/users/:id", handleUpdateUser(usersRepo))
	g.PUT("/workspaces/:id/subscription", handleSetSubscription(subRepo))
}
