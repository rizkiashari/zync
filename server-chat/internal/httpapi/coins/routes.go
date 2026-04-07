package coins

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/repository"
)

// Register mounts coin endpoints under the given group (must have Bearer middleware).
func Register(rg *gin.RouterGroup, coins *repository.CoinRepository, users *repository.UserRepository) {
	g := rg.Group("/coins")
	g.GET("/balance", getBalance(coins))
	g.GET("/transactions", getTransactions(coins))
	g.POST("/topup", postTopup(coins))
	g.POST("/sawer", postSawer(coins, users))
}
