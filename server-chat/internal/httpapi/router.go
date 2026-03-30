package httpapi

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"

	"zync-server/internal/httpapi/admin"
	"zync-server/internal/httpapi/authroute"
	"zync-server/internal/httpapi/bookmarks"
	"zync-server/internal/httpapi/calls"
	"zync-server/internal/httpapi/dashboard"
	"zync-server/internal/httpapi/health"
	"zync-server/internal/httpapi/messages"
	"zync-server/internal/httpapi/onboardingpricing"
	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/notifications"
	"zync-server/internal/httpapi/profile"
	"zync-server/internal/httpapi/realtime"
	"zync-server/internal/httpapi/recenttasks"
	"zync-server/internal/httpapi/rooms"
	"zync-server/internal/httpapi/tasks"
	"zync-server/internal/httpapi/upload"
	"zync-server/internal/httpapi/users"
	"zync-server/internal/httpapi/workspaces"
	applogger "zync-server/internal/logger"
)

func NewRouter(d Deps) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())

	r.Use(middleware.RequestID())
	r.Use(applogger.RequestLogger(d.Logger))

	r.Use(cors.New(cors.Config{
		AllowOrigins:     d.Config.AllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Request-ID", "X-Workspace-Slug"},
		ExposeHeaders:    []string{"Content-Length", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// General rate limit: 60 req/s burst 120 per IP
	r.Use(middleware.RateLimit(rate.Limit(60), 120))

	r.Static("/uploads", "./uploads")

	RegisterSwagger(r)

	health.Register(r)

	// Auth routes get a stricter rate limit: 10 req/s burst 20
	authGroup := r.Group("")
	authGroup.Use(middleware.RateLimit(rate.Limit(10), 20))
	authroute.Register(authGroup, d.Users, d.RefreshTokens, d.Auth, d.Workspaces)

	realtime.Register(r, d.Hub, d.Messages, d.Rooms, d.Users, d.Auth, d.Config.AllowedOrigins)

	// ── Public endpoints (no Bearer auth) ────────────────────────────
	publicAPI := r.Group("/api")
	onboardingpricing.RegisterPublic(publicAPI, d.OnboardingPricingPlans)

	// ── Bearer-only routes (no workspace context required) ─────────────
	api := r.Group("/api")
	api.Use(middleware.Bearer(d.Auth))

	profile.Register(api, d.Users, "./uploads")
	workspaces.Register(api, d.Workspaces, d.Users, "./uploads")

	adminAPI := api.Group("/admin")
	adminAPI.Use(middleware.SystemAdmin(d.Users))
	admin.Register(adminAPI, d.Users)
	onboardingpricing.RegisterAdmin(adminAPI, d.OnboardingPricingPlans)

	// ── Workspace-scoped routes (Bearer + Tenant middleware) ────────────
	wsGroup := api.Group("")
	wsGroup.Use(middleware.Tenant(d.Workspaces, d.Users))

	users.Register(wsGroup, d.Users)
	dashboard.Register(wsGroup, d.Rooms, d.Users)
	rooms.Register(wsGroup, d.Hub, d.Rooms, d.Users, d.Workspaces, d.Messages)
	messages.Register(wsGroup, d.Messages, d.Rooms)
	upload.Register(wsGroup, d.Rooms, "./uploads")
	notifications.Register(wsGroup, d.Notifications)
	tasks.Register(wsGroup, d.Hub, d.Tasks, d.Rooms)
	calls.Register(wsGroup, d.Hub, d.Rooms, d.Users, d.Config)
	recenttasks.Register(wsGroup, d.RecentTasks)
	bookmarks.Register(wsGroup, d.Bookmarks, d.Messages)

	return r
}
