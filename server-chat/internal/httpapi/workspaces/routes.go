package workspaces

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/hub"
	"zync-server/internal/repository"
)

// Register mounts workspace endpoints on two groups:
//
//	noTenant — routes that don't require a workspace context (create, list, join)
//	withAuth  — routes that only need Bearer auth (profile-level, no workspace yet)
//
// Routes that need a workspace context are nested under a Tenant middleware group.
func Register(api *gin.RouterGroup, wsRepo *repository.WorkspaceRepository, usersRepo *repository.UserRepository, uploadsDir string, subRepo *repository.SubscriptionRepository, roomsRepo *repository.RoomRepository, plansRepo *repository.OnboardingPricingRepository, paymentTxns *repository.PaymentTransactionRepository, notifRepo *repository.NotificationRepository, h *hub.Hub) {
	g := api.Group("/workspaces")

	// No workspace context needed
	g.POST("", handleCreate(wsRepo, usersRepo))
	g.GET("/me", handleListMine(wsRepo))
	g.POST("/join", handleJoinWithBody(wsRepo, h))
	g.POST("/join/:token", handleJoin(wsRepo, h))

	// Workspace-scoped routes
	ws := g.Group("")
	ws.Use(middleware.Tenant(wsRepo, usersRepo))
	ws.GET("/current", handleGetCurrent(wsRepo))
	ws.GET("/invite", handleGetInvite(wsRepo))
	ws.POST("/invite/regenerate", handleRegenerateInvite(wsRepo, usersRepo))
	ws.PUT("/branding", handleUpdateBranding(wsRepo, usersRepo))
	ws.POST("/branding/logo", handleUploadLogo(wsRepo, usersRepo, uploadsDir))
	ws.GET("/members", handleListMembers(wsRepo))
	ws.PUT("/members/:userId/role", handleUpdateMemberRole(wsRepo, usersRepo, notifRepo, h))
	ws.DELETE("/members/:userId", handleRemoveMember(wsRepo, usersRepo, h))
	ws.DELETE("/me/leave", handleLeaveMe(wsRepo, roomsRepo, h))
	ws.DELETE("", handleDeleteWorkspace(wsRepo, usersRepo))
	ws.GET("/analytics", handleGetAnalytics(wsRepo, usersRepo))
	ws.GET("/subscription", handleGetSubscription(subRepo, usersRepo))
	ws.GET("/payment-transactions", handleListPaymentTransactions(paymentTxns))
	ws.POST("/payment-transactions/request", handleRequestManualPayment(paymentTxns, plansRepo, wsRepo, usersRepo, uploadsDir))
}
