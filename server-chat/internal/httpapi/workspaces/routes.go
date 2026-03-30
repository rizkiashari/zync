package workspaces

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/repository"
)

// Register mounts workspace endpoints on two groups:
//
//	noTenant — routes that don't require a workspace context (create, list, join)
//	withAuth  — routes that only need Bearer auth (profile-level, no workspace yet)
//
// Routes that need a workspace context are nested under a Tenant middleware group.
func Register(api *gin.RouterGroup, wsRepo *repository.WorkspaceRepository, usersRepo *repository.UserRepository, uploadsDir string) {
	g := api.Group("/workspaces")

	// No workspace context needed
	g.POST("", handleCreate(wsRepo))
	g.GET("/me", handleListMine(wsRepo))
	g.POST("/join/:token", handleJoin(wsRepo))

	// Workspace-scoped routes
	ws := g.Group("")
	ws.Use(middleware.Tenant(wsRepo, usersRepo))
	ws.GET("/current", handleGetCurrent())
	ws.GET("/invite", handleGetInvite(wsRepo))
	ws.POST("/invite/regenerate", handleRegenerateInvite(wsRepo))
	ws.PUT("/branding", handleUpdateBranding(wsRepo))
	ws.POST("/branding/logo", handleUploadLogo(wsRepo, uploadsDir))
	ws.GET("/members", handleListMembers(wsRepo))
	ws.PUT("/members/:userId/role", handleUpdateMemberRole(wsRepo))
	ws.DELETE("/members/:userId", handleRemoveMember(wsRepo, usersRepo))
	ws.DELETE("/me/leave", handleLeaveMe(wsRepo))
}
