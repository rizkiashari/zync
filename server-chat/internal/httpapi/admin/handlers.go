package admin

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/httpapi/workspaces"
	"zync-server/internal/hub"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

type adminUpdateUserBody struct {
	Username      *string `json:"username" binding:"omitempty,min=2,max=64"`
	Bio           *string `json:"bio" binding:"omitempty,max=256"`
	IsSystemAdmin *bool   `json:"is_system_admin"`
}

func handleListUsers(usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		list, err := usersRepo.ListAllForAdmin(c.Query("search"))
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if list == nil {
			list = make([]models.User, 0)
		}
		response.OK(c, list)
	}
}

func handleGetUser(usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id64, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid user ID")
			return
		}
		u, err := usersRepo.GetByID(uint(id64))
		if err != nil || u == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "User not found")
			return
		}
		response.OK(c, u)
	}
}

func handleUpdateUser(usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		actorID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		id64, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid user ID")
			return
		}
		targetID := uint(id64)

		var req adminUpdateUserBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid or malformed request body")
			return
		}

		target, err := usersRepo.GetByID(targetID)
		if err != nil || target == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "User not found")
			return
		}

		if req.IsSystemAdmin != nil && !*req.IsSystemAdmin && targetID == actorID {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Cannot remove system admin from yourself")
			return
		}

		if req.IsSystemAdmin != nil && !*req.IsSystemAdmin {
			n, err := usersRepo.CountSystemAdmins()
			if err != nil {
				response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
				return
			}
			if target.IsSystemAdmin && n <= 1 {
				response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Cannot remove the last system admin")
				return
			}
		}

		updates := map[string]any{}
		if req.Username != nil {
			username := strings.TrimSpace(*req.Username)
			if username == "" {
				response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Username cannot be empty")
				return
			}
			existing, err := usersRepo.GetByUsername(username)
			if err != nil {
				response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
				return
			}
			if existing != nil && existing.ID != targetID {
				response.Error(c, http.StatusConflict, response.CodeUsernameTaken, "Username is already taken")
				return
			}
			updates["username"] = username
		}
		if req.Bio != nil {
			updates["bio"] = strings.TrimSpace(*req.Bio)
		}
		if req.IsSystemAdmin != nil {
			updates["is_system_admin"] = *req.IsSystemAdmin
		}

		if len(updates) == 0 {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "No fields to update")
			return
		}

		if err := usersRepo.UpdateProfileFields(targetID, updates); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		u, err := usersRepo.GetByID(targetID)
		if err != nil || u == nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, u)
	}
}

type setSubscriptionBody struct {
	Plan        string `json:"plan" binding:"required,oneof=free pro enterprise"`
	Status      string `json:"status" binding:"required,oneof=active expired canceled"`
	MemberLimit int    `json:"member_limit" binding:"required,min=1"`
}

func handleSetSubscription(subRepo *repository.SubscriptionRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id64, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid workspace ID")
			return
		}
		var req setSubscriptionBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid request body")
			return
		}
		sub, err := subRepo.SetPlan(uint(id64), req.Plan, req.Status, req.MemberLimit, nil)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to update subscription")
			return
		}
		response.OK(c, gin.H{"subscription": sub})
	}
}

func handleAdminListPaymentTransactions(txnRepo *repository.PaymentTransactionRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		status := strings.TrimSpace(c.Query("status"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
		offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
		list, err := txnRepo.ListForAdmin(status, limit, offset)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to load transactions")
			return
		}
		response.OK(c, gin.H{"transactions": list})
	}
}

func handleAdminApprovePaymentTransaction(txnRepo *repository.PaymentTransactionRepository, h *hub.Hub, wsRepo *repository.WorkspaceRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id64, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid transaction ID")
			return
		}
		adminID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		if err := txnRepo.ApproveByAdmin(uint(id64), adminID); err != nil {
			if errors.Is(err, repository.ErrPaymentTxnNotPending) {
				response.Error(c, http.StatusConflict, "not_pending", "Transaction is not pending")
				return
			}
			response.Error(c, http.StatusBadRequest, "approve_failed", err.Error())
			return
		}
		tx, _ := txnRepo.GetByID(uint(id64))
		if tx != nil && tx.WorkspaceID != 0 && h != nil && wsRepo != nil {
			if ws, werr := wsRepo.GetByID(tx.WorkspaceID); werr == nil && ws != nil {
				workspaces.NotifyWorkspaceSubscriptionRefresh(h, wsRepo, tx.WorkspaceID, ws.Slug)
			}
		}
		response.OK(c, gin.H{"transaction": tx})
	}
}

type adminRejectPaymentBody struct {
	Note string `json:"note"`
}

func handleAdminRejectPaymentTransaction(txnRepo *repository.PaymentTransactionRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id64, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid transaction ID")
			return
		}
		adminID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		var body adminRejectPaymentBody
		_ = c.ShouldBindJSON(&body)
		if err := txnRepo.RejectByAdmin(uint(id64), adminID, body.Note); err != nil {
			if errors.Is(err, repository.ErrPaymentTxnNotPending) {
				response.Error(c, http.StatusConflict, "not_pending", "Transaction is not pending")
				return
			}
			response.Error(c, http.StatusBadRequest, "reject_failed", err.Error())
			return
		}
		tx, _ := txnRepo.GetByID(uint(id64))
		response.OK(c, gin.H{"transaction": tx})
	}
}
