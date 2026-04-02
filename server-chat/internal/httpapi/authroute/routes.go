package authroute

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/auth"
	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/repository"
)

func Register(r gin.IRouter, users *repository.UserRepository, rtRepo *repository.RefreshTokenRepository, jwtSvc *auth.Service, wsRepo *repository.WorkspaceRepository) {
	r.POST("/auth/register", handleRegister(users, rtRepo, jwtSvc))
	r.POST("/auth/login", handleLogin(users, rtRepo, jwtSvc, wsRepo))
	r.POST("/auth/refresh", handleRefresh(rtRepo, jwtSvc))

	// Logout requires a valid access token
	logout := r.Group("/auth")
	logout.Use(middleware.Bearer(jwtSvc))
	logout.POST("/logout", handleLogout(rtRepo))
}
