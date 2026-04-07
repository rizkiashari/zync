package stickers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/repository"
)

// GET /api/stickers/catalog
func getCatalog(repo *repository.StickerRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		packs, err := repo.ListCatalog()
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to load catalog")
			return
		}
		response.OK(c, gin.H{"packs": packs})
	}
}

// GET /api/stickers/owned
func getOwned(repo *repository.StickerRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}
		packs, err := repo.GetOwned(uid)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to load owned packs")
			return
		}
		response.OK(c, gin.H{"packs": packs})
	}
}

// POST /api/stickers/purchase
// Body: { "pack_id": 2 }
func postPurchase(repo *repository.StickerRepository, coins *repository.CoinRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}
		var body struct {
			PackID uint `json:"pack_id" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "pack_id is required")
			return
		}

		if err := repo.Purchase(uid, body.PackID, coins); err != nil {
			switch {
			case errors.Is(err, repository.ErrInsufficientCoins):
				response.Error(c, http.StatusPaymentRequired, "insufficient_coins", "Koin tidak cukup untuk membeli stiker ini")
			case errors.Is(err, repository.ErrStickerPackAlreadyOwned):
				response.Error(c, http.StatusConflict, "already_owned", "Kamu sudah memiliki stiker pack ini")
			default:
				response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to purchase sticker pack")
			}
			return
		}

		// Return updated balance
		balance, _ := coins.GetBalance(uid)
		owned, _ := repo.GetOwned(uid)
		response.OK(c, gin.H{
			"message":     "Stiker berhasil dibeli",
			"pack_id":     strconv.Itoa(int(body.PackID)),
			"coin_balance": balance,
			"owned_packs": owned,
		})
	}
}
