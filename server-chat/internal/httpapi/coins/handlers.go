package coins

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/repository"
)

// GET /api/coins/balance
func getBalance(coins *repository.CoinRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}
		balance, err := coins.GetBalance(uid)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to get balance")
			return
		}
		response.OK(c, gin.H{"balance": balance})
	}
}

// POST /api/coins/topup
// Body: { "amount": 1000 }
// Simple direct topup — integrate with Midtrans for production.
func postTopup(coins *repository.CoinRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}
		var body struct {
			Amount int64 `json:"amount" binding:"required,min=1"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "amount must be a positive integer")
			return
		}
		refID := fmt.Sprintf("topup-%d-%d", uid, c.GetInt64("requestTime"))
		if err := coins.Topup(uid, body.Amount, refID, "Direct topup"); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to topup")
			return
		}
		balance, _ := coins.GetBalance(uid)
		response.OK(c, gin.H{"balance": balance})
	}
}

// POST /api/coins/sawer
// Body: { "receiver_identity": "username or user_id string", "amount": 500, "message": "..." }
func postSawer(coins *repository.CoinRepository, users *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		senderID, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}
		var body struct {
			ReceiverIdentity string `json:"receiver_identity" binding:"required"`
			Amount           int64  `json:"amount"            binding:"required,min=1"`
			Message          string `json:"message"`
			RoomID           uint   `json:"room_id"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid request body")
			return
		}

		// Resolve receiver by username or user_id string
		receiver, err := users.GetByUsername(strings.TrimSpace(body.ReceiverIdentity))
		if err != nil || receiver == nil {
			response.Error(c, http.StatusNotFound, "receiver_not_found", "Receiver not found")
			return
		}
		if receiver.ID == senderID {
			response.Error(c, http.StatusBadRequest, "self_sawer", "Cannot sawer to yourself")
			return
		}

		refID := fmt.Sprintf("sawer-room%d-%d-%d", body.RoomID, senderID, receiver.ID)
		note := strings.TrimSpace(body.Message)
		if err := coins.Sawer(senderID, receiver.ID, body.Amount, refID, note); err != nil {
			if errors.Is(err, repository.ErrInsufficientCoins) {
				response.Error(c, http.StatusPaymentRequired, "insufficient_coins", "Koin tidak cukup")
				return
			}
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to process sawer")
			return
		}

		balance, _ := coins.GetBalance(senderID)
		response.OK(c, gin.H{
			"balance":  balance,
			"receiver": receiver.Username,
			"amount":   body.Amount,
		})
	}
}

// GET /api/coins/transactions
func getTransactions(coins *repository.CoinRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}
		rows, err := coins.ListTransactions(uid, 50)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to get transactions")
			return
		}
		response.OK(c, gin.H{"transactions": rows})
	}
}
