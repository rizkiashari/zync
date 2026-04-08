package payments

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/config"
	"zync-server/internal/repository"
)

// RegisterPublic mounts unauthenticated payment callbacks (Midtrans notification).
func RegisterPublic(g *gin.RouterGroup, cfg *config.Config, txns *repository.PaymentTransactionRepository, coins *repository.CoinRepository) {
	g.POST("/payments/midtrans/notification", handleMidtransNotification(cfg, txns, coins))
}

// Register mounts workspace-scoped payment routes (Bearer + Tenant).
func Register(g *gin.RouterGroup, cfg *config.Config, plans *repository.OnboardingPricingRepository, users *repository.UserRepository, txns *repository.PaymentTransactionRepository) {
	g.POST("/payments/midtrans/snap-token", postSnapToken(cfg, plans, users, txns))
}
