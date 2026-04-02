package payments

import (
	"crypto/sha512"
	"encoding/hex"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"zync-server/internal/config"
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

// handleMidtransNotification handles Midtrans HTTP(S) notification (no auth — signature verified).
// Configure URL in Midtrans dashboard: POST {PUBLIC_URL}/api/payments/midtrans/notification
func handleMidtransNotification(cfg *config.Config, txns *repository.PaymentTransactionRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.TrimSpace(cfg.MidtransServerKey) == "" {
			c.String(http.StatusServiceUnavailable, "payment unavailable")
			return
		}

		_ = c.Request.ParseForm()
		orderID := strings.TrimSpace(c.PostForm("order_id"))
		statusCode := strings.TrimSpace(c.PostForm("status_code"))
		grossAmount := strings.TrimSpace(c.PostForm("gross_amount"))
		sig := strings.TrimSpace(c.PostForm("signature_key"))
		transStatus := strings.TrimSpace(c.PostForm("transaction_status"))
		paymentType := strings.TrimSpace(c.PostForm("payment_type"))
		transID := strings.TrimSpace(c.PostForm("transaction_id"))

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
			_ = txns.ApplyMidtransSuccess(orderID, meta)
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
