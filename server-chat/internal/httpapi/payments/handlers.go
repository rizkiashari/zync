package payments

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"zync-server/internal/config"
	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/repository"
)

type snapTokenBody struct {
	PlanKey       string `json:"plan_key" binding:"required"`
	PaymentMethod string `json:"payment_method" binding:"required"`
}

func enabledPaymentsForMethod(m string) ([]string, bool) {
	switch strings.ToLower(strings.TrimSpace(m)) {
	case "gopay":
		return []string{"gopay"}, true
	case "qris":
		return []string{"qris"}, true
	case "bca":
		return []string{"bca_va"}, true
	case "bni":
		return []string{"bni_va"}, true
	default:
		return nil, false
	}
}

func postSnapToken(cfg *config.Config, plans *repository.OnboardingPricingRepository, users *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.TrimSpace(cfg.MidtransServerKey) == "" {
			response.Error(c, http.StatusServiceUnavailable, "payment_unavailable", "Midtrans is not configured on the server")
			return
		}

		var body snapTokenBody
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid request body")
			return
		}

		enabled, ok := enabledPaymentsForMethod(body.PaymentMethod)
		if !ok {
			response.Error(c, http.StatusBadRequest, "invalid_payment_method", "payment_method must be gopay, qris, bca, or bni")
			return
		}

		planKey := strings.ToLower(strings.TrimSpace(body.PlanKey))
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
			response.Error(c, http.StatusBadRequest, "invalid_price", "This plan has no payable amount — set price_idr in onboarding pricing")
			return
		}

		wsID, ok := middleware.WorkspaceID(c)
		if !ok {
			response.Error(c, http.StatusBadRequest, "missing_workspace", "Workspace context required")
			return
		}

		uid, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}

		u, err := users.GetByID(uid)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to load user")
			return
		}
		email := "customer@example.com"
		first := "Customer"
		if u != nil {
			if u.Email != "" {
				email = u.Email
			}
			if nm := strings.TrimSpace(u.Username); nm != "" {
				first = nm
			} else if u.Email != "" {
				first = strings.Split(u.Email, "@")[0]
			}
		}

		orderID := fmt.Sprintf("zync-w%u-%s-%d", wsID, planKey, time.Now().UnixNano())
		gross := int64(plan.PriceIDR)
		payload := snapTransactionPayload{
			TransactionDetails: map[string]any{
				"order_id":     orderID,
				"gross_amount": gross,
			},
			CustomerDetails: map[string]any{
				"first_name": first,
				"email":      email,
			},
			ItemDetails: []map[string]any{
				{
					"id":       plan.Key,
					"price":    gross,
					"quantity": 1,
					"name":     plan.Title,
				},
			},
			EnabledPayments: enabled,
		}

		token, err := createSnapToken(cfg.MidtransServerKey, cfg.MidtransIsProduction, payload)
		if err != nil {
			response.Error(c, http.StatusBadGateway, "midtrans_error", "Could not start payment — try again later")
			return
		}

		response.OK(c, gin.H{
			"token":    token,
			"order_id": orderID,
		})
	}
}
