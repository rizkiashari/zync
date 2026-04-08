package coins

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/config"
	"zync-server/internal/repository"
)

// Register mounts coin endpoints under the given group (must have Bearer middleware).
func Register(rg *gin.RouterGroup, coins *repository.CoinRepository, users *repository.UserRepository, txns *repository.PaymentTransactionRepository, withdrawals *repository.CoinWithdrawalRepository, cfg *config.Config) {
	g := rg.Group("/coins")
	g.GET("/balance", getBalance(coins))
	g.GET("/transactions", getTransactions(coins))
	g.POST("/topup", postTopup(coins))
	g.POST("/topup-snap", postTopupSnap(coins, users, txns, cfg))
	g.POST("/sawer", postSawer(coins, users))
	g.POST("/withdraw", postWithdraw(coins, withdrawals))
	g.GET("/withdrawals", getWithdrawals(withdrawals))
}
