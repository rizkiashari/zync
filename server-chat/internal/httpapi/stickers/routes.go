package stickers

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/repository"
)

// Register mounts sticker endpoints under the given group (must have Bearer middleware).
func Register(rg *gin.RouterGroup, repo *repository.StickerRepository, coins *repository.CoinRepository) {
	g := rg.Group("/stickers")
	g.GET("/catalog", getCatalog(repo))
	g.GET("/owned", getOwned(repo))
	g.POST("/purchase", postPurchase(repo, coins))
}
