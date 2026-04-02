package payments

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/config"
	"zync-server/internal/repository"
)

// Register mounts workspace-scoped payment routes (Bearer + Tenant).
func Register(g *gin.RouterGroup, cfg *config.Config, plans *repository.OnboardingPricingRepository, users *repository.UserRepository) {
	g.POST("/payments/midtrans/snap-token", postSnapToken(cfg, plans, users))
}
