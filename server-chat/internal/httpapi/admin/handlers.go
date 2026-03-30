package admin

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
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
