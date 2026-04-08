package coins

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"zync-server/internal/config"
	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/models"
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

// ─── Midtrans Snap Topup ────────────────────────────────────────────────────

type coinSnapPayload struct {
	TransactionDetails map[string]any   `json:"transaction_details"`
	CustomerDetails    map[string]any   `json:"customer_details"`
	ItemDetails        []map[string]any `json:"item_details"`
	EnabledPayments    []string         `json:"enabled_payments,omitempty"`
}

type coinSnapResponse struct {
	Token string `json:"token"`
}

func createCoinSnapToken(serverKey string, production bool, payload coinSnapPayload) (string, error) {
	body, _ := json.Marshal(payload)
	base := "https://app.sandbox.midtrans.com"
	if production {
		base = "https://app.midtrans.com"
	}
	req, err := http.NewRequest(http.MethodPost, base+"/snap/v1/transactions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	auth := base64.StdEncoding.EncodeToString([]byte(serverKey + ":"))
	req.Header.Set("Authorization", "Basic "+auth)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("midtrans HTTP %d: %s", resp.StatusCode, raw)
	}
	var out coinSnapResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", fmt.Errorf("decode: %w body=%s", err, raw)
	}
	if out.Token == "" {
		return "", fmt.Errorf("empty token: %s", raw)
	}
	return out.Token, nil
}

// POST /api/coins/topup-snap
// Body: { "amount": 50000, "payment_method": "gopay" }
// amount is in IDR. Topup rate: 1 IDR = 1 coin.
func postTopupSnap(coins *repository.CoinRepository, users *repository.UserRepository, txns *repository.PaymentTransactionRepository, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.TrimSpace(cfg.MidtransServerKey) == "" {
			response.Error(c, http.StatusServiceUnavailable, "payment_unavailable", "Midtrans is not configured")
			return
		}
		uid, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}
		var body struct {
			Amount        int64  `json:"amount"         binding:"required,min=5000"`
			PaymentMethod string `json:"payment_method" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "amount (min 5000 IDR) and payment_method required")
			return
		}

		enabled := enabledCoinPayments(body.PaymentMethod)
		if enabled == nil {
			response.Error(c, http.StatusBadRequest, "invalid_payment_method", "payment_method must be gopay, qris, bca, or bni")
			return
		}

		u, _ := users.GetByID(uid)
		email, first := "customer@example.com", "Customer"
		if u != nil {
			if u.Email != "" {
				email = u.Email
			}
			if nm := strings.TrimSpace(u.Username); nm != "" {
				first = nm
			}
		}

		orderID := fmt.Sprintf("zync-coin-%d-%d", uid, time.Now().UnixNano())
		// Store as pending payment transaction; plan_key="coin_topup"
		rec := &models.PaymentTransaction{
			WorkspaceID:   0, // no workspace context for coin topup
			UserID:        uid,
			OrderID:       orderID,
			PlanKey:       "coin_topup",
			AmountIDR:     body.Amount,
			Currency:      "IDR",
			PaymentMethod: strings.ToLower(strings.TrimSpace(body.PaymentMethod)),
			Channel:       models.PayChannelMidtrans,
			Status:        models.PayTxnPending,
		}
		if err := txns.Create(rec); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to record transaction")
			return
		}

		payload := coinSnapPayload{
			TransactionDetails: map[string]any{
				"order_id":     orderID,
				"gross_amount": body.Amount,
			},
			CustomerDetails: map[string]any{"first_name": first, "email": email},
			ItemDetails: []map[string]any{
				{"id": "coin_topup", "price": body.Amount, "quantity": 1, "name": fmt.Sprintf("Coin Topup %d koin", body.Amount)},
			},
			EnabledPayments: enabled,
		}
		token, err := createCoinSnapToken(cfg.MidtransServerKey, cfg.MidtransIsProduction, payload)
		if err != nil {
			response.Error(c, http.StatusBadGateway, "midtrans_error", "Could not start payment — try again later")
			return
		}
		response.OK(c, gin.H{"token": token, "order_id": orderID, "coins": body.Amount})
	}
}

func enabledCoinPayments(m string) []string {
	switch strings.ToLower(strings.TrimSpace(m)) {
	case "gopay":
		return []string{"gopay"}
	case "qris":
		return []string{"qris"}
	case "bca":
		return []string{"bca_va"}
	case "bni":
		return []string{"bni_va"}
	default:
		return nil
	}
}

// ─── Withdrawal ─────────────────────────────────────────────────────────────

// POST /api/coins/withdraw
// Body: { "coins": 500, "bank_name": "BCA", "bank_account": "123456", "account_name": "..." }
// Rate: 1 coin = 1 IDR (can be adjusted).
func postWithdraw(coins *repository.CoinRepository, withdrawals *repository.CoinWithdrawalRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}
		var body struct {
			Coins       int64  `json:"coins"        binding:"required,min=100"`
			BankName    string `json:"bank_name"    binding:"required"`
			BankAccount string `json:"bank_account" binding:"required"`
			AccountName string `json:"account_name" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "coins (min 100), bank_name, bank_account, account_name required")
			return
		}

		req := &models.CoinWithdrawal{
			UserID:      uid,
			Coins:       body.Coins,
			AmountIDR:   body.Coins, // 1:1 rate; adjust as needed
			BankName:    strings.TrimSpace(body.BankName),
			BankAccount: strings.TrimSpace(body.BankAccount),
			AccountName: strings.TrimSpace(body.AccountName),
		}
		if err := withdrawals.Submit(req); err != nil {
			if errors.Is(err, repository.ErrInsufficientCoins) {
				response.Error(c, http.StatusPaymentRequired, "insufficient_coins", "Koin tidak cukup")
				return
			}
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to process withdrawal")
			return
		}

		balance, _ := coins.GetBalance(uid)
		response.OK(c, gin.H{"withdrawal": req, "balance": balance})
	}
}

// GET /api/coins/withdrawals
func getWithdrawals(withdrawals *repository.CoinWithdrawalRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}
		rows, err := withdrawals.ListByUser(uid)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to fetch withdrawals")
			return
		}
		response.OK(c, gin.H{"withdrawals": rows})
	}
}
