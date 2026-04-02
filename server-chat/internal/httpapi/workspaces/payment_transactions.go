package workspaces

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

func handleListPaymentTransactions(txns *repository.PaymentTransactionRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		list, err := txns.ListByWorkspace(ws.ID, 100)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to load transactions")
			return
		}
		response.OK(c, gin.H{"transactions": list})
	}
}

func handleRequestManualPayment(txns *repository.PaymentTransactionRepository, plans *repository.OnboardingPricingRepository, wsRepo *repository.WorkspaceRepository, usersRepo *repository.UserRepository, uploadsDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		userID, _ := middleware.UserID(c)
		actor, err := usersRepo.GetByID(userID)
		if err != nil || actor == nil {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Forbidden")
			return
		}
		if !canWorkspaceAdminOrOwner(actor, wsRepo, ws.ID) {
			response.Error(c, http.StatusForbidden, "forbidden", "Only workspace owner or admin can request manual payment")
			return
		}
		if err := c.Request.ParseMultipartForm(12 << 20); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid multipart form")
			return
		}
		planKey := strings.ToLower(strings.TrimSpace(c.PostForm("plan_key")))
		bankName := strings.TrimSpace(c.PostForm("bank_name"))
		rawAcct := c.PostForm("account_digits")
		accountDigits := strings.TrimSpace(strings.ReplaceAll(strings.ReplaceAll(rawAcct, " ", ""), "-", ""))

		if planKey == "" {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "plan_key is required")
			return
		}
		if len(bankName) < 2 || len(bankName) > 128 {
			response.Error(c, http.StatusBadRequest, "invalid_bank", "Nama bank wajib (2–128 karakter)")
			return
		}
		if len(accountDigits) < 4 || len(accountDigits) > 32 {
			response.Error(c, http.StatusBadRequest, "invalid_account", "Nomor rekening pengirim wajib (4–32 digit)")
			return
		}
		for _, ch := range accountDigits {
			if ch < '0' || ch > '9' {
				response.Error(c, http.StatusBadRequest, "invalid_account", "Nomor rekening hanya angka")
				return
			}
		}

		fh, err := c.FormFile("proof")
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Upload bukti pembayaran (gambar) wajib")
			return
		}
		ext := strings.ToLower(filepath.Ext(fh.Filename))
		if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".webp" {
			response.Error(c, http.StatusBadRequest, "invalid_file_type", "Bukti: PNG, JPG, atau WebP")
			return
		}

		list, err := plans.List()
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to load pricing")
			return
		}
		var plan *repository.PricingPlanEntry
		for i := range list {
			if strings.ToLower(list[i].Key) == planKey {
				plan = &list[i]
				break
			}
		}
		if plan == nil {
			response.Error(c, http.StatusNotFound, "plan_not_found", "Unknown plan")
			return
		}
		if plan.PriceIDR <= 0 {
			response.Error(c, http.StatusBadRequest, "invalid_price", "Choose a paid plan for manual payment request")
			return
		}

		proofDir := filepath.Join(uploadsDir, "payment-proofs")
		if err := os.MkdirAll(proofDir, 0755); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to prepare upload")
			return
		}
		filename := fmt.Sprintf("proof_w%d_%d%s", ws.ID, time.Now().UnixMilli(), ext)
		dest := filepath.Join(proofDir, filename)
		if err := c.SaveUploadedFile(fh, dest); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to save proof")
			return
		}
		proofURL := "/uploads/payment-proofs/" + filename

		orderID := fmt.Sprintf("manual-w%d-%d", ws.ID, time.Now().UnixNano())
		rec := &models.PaymentTransaction{
			WorkspaceID:              ws.ID,
			UserID:                   userID,
			OrderID:                  orderID,
			PlanKey:                  planKey,
			AmountIDR:                int64(plan.PriceIDR),
			Currency:                 "IDR",
			PaymentMethod:            "manual",
			Channel:                  models.PayChannelManual,
			Status:                   models.PayTxnPending,
			ManualProofImageURL:      proofURL,
			ManualPayerBankName:      bankName,
			ManualPayerAccountDigits: accountDigits,
		}
		if err := txns.Create(rec); err != nil {
			_ = os.Remove(dest)
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to create payment request")
			return
		}
		response.Created(c, gin.H{"transaction": rec})
	}
}
