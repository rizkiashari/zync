package payments

import (
	"crypto/sha512"
	"encoding/hex"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"zync-server/internal/config"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

func verifyMidtransSignature(orderID, statusCode, grossAmount, serverKey, wantSignature string) bool {
	wantSignature = strings.TrimSpace(wantSignature)
	if wantSignature == "" || serverKey == "" {
		return false
	}
	raw := orderID + statusCode + grossAmount + serverKey
	sum := sha512.Sum512([]byte(raw))
	got := hex.EncodeToString(sum[:])
	return strings.EqualFold(got, wantSignature)
}

type midtransNotifBody struct {
	OrderID           string `json:"order_id"`
	StatusCode        string `json:"status_code"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
	TransactionStatus string `json:"transaction_status"`
	PaymentType       string `json:"payment_type"`
	TransactionID     string `json:"transaction_id"`
}

// handleMidtransNotification handles Midtrans HTTP(S) notification (no auth — signature verified).
// Configure URL in Midtrans dashboard: POST {PUBLIC_URL}/api/payments/midtrans/notification
func handleMidtransNotification(cfg *config.Config, txns *repository.PaymentTransactionRepository, coins *repository.CoinRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.TrimSpace(cfg.MidtransServerKey) == "" {
			c.String(http.StatusServiceUnavailable, "payment unavailable")
			return
		}

		var body midtransNotifBody
		if err := c.ShouldBindJSON(&body); err != nil {
			c.String(http.StatusBadRequest, "invalid body")
			return
		}
		orderID := strings.TrimSpace(body.OrderID)
		statusCode := strings.TrimSpace(body.StatusCode)
		grossAmount := strings.TrimSpace(body.GrossAmount)
		sig := strings.TrimSpace(body.SignatureKey)
		transStatus := strings.TrimSpace(body.TransactionStatus)
		paymentType := strings.TrimSpace(body.PaymentType)
		transID := strings.TrimSpace(body.TransactionID)

		if orderID == "" {
			c.String(http.StatusOK, "OK")
			return
		}

		sigOK := verifyMidtransSignature(orderID, statusCode, grossAmount, cfg.MidtransServerKey, sig)
		if !sigOK {
			sigOK = verifyMidtransSignature(orderID, statusCode, normalizeGrossAmountForSignature(grossAmount), cfg.MidtransServerKey, sig)
		}
		if !sigOK {
			c.String(http.StatusForbidden, "invalid signature")
			return
		}

		meta := map[string]string{
			"transaction_status": transStatus,
			"payment_type":       paymentType,
			"transaction_id":     transID,
		}
		ts := strings.ToLower(transStatus)
		switch ts {
		case "settlement", "capture":
			// Coin topup orders are prefixed "zync-coin-{uid}-..."
			if strings.HasPrefix(orderID, "zync-coin-") {
				applyCoinTopupSuccess(txns, coins, orderID, meta)
			} else {
				_ = txns.ApplyMidtransSuccess(orderID, meta)
			}
		case "pending":
			_ = txns.UpdateMidtransMirror(orderID, transStatus, paymentType, transID)
		case "deny", "cancel", "expire", "failure":
			_ = txns.MarkMidtransNonSuccess(orderID, transStatus, paymentType, transID)
		default:
			_ = txns.UpdateMidtransMirror(orderID, transStatus, paymentType, transID)
		}

		c.String(http.StatusOK, "OK")
	}
}

// applyCoinTopupSuccess marks payment approved and credits coins to the user's wallet.
func applyCoinTopupSuccess(txns *repository.PaymentTransactionRepository, coins *repository.CoinRepository, orderID string, meta map[string]string) {
	txn, err := txns.GetByOrderID(orderID)
	if err != nil || txn == nil {
		return
	}
	if txn.Status == models.PayTxnApproved {
		return // idempotent
	}
	// Mark transaction approved (reuse existing helper via raw update to avoid subscription logic)
	_ = txns.UpdateMidtransMirror(orderID, meta["transaction_status"], meta["payment_type"], meta["transaction_id"])
	_ = txns.MarkCoinTopupApproved(orderID)
	// Credit coins: 1 IDR = 1 coin
	_ = coins.Topup(txn.UserID, txn.AmountIDR, orderID, "Coin topup via Midtrans")
}

// normalizeGrossAmountForSignature matches Midtrans docs (string as sent, often "10000.00").
func normalizeGrossAmountForSignature(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return s
	}
	if f, err := strconv.ParseFloat(s, 64); err == nil {
		if f == float64(int64(f)) {
			return strconv.FormatInt(int64(f), 10)
		}
		return strings.TrimRight(strings.TrimRight(strconv.FormatFloat(f, 'f', 2, 64), "0"), ".")
	}
	return s
}
