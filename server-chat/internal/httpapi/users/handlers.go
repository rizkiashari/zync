package users

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

type blockBody struct {
	UserID uint `json:"user_id" binding:"required"`
}

// handleList godoc
// @Summary      List users
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Param        search query string false "Search by username or email"
// @Success      200 {object} apidocs.UsersListSuccess
// @Failure      401 {object} apidocs.ErrorEnvelope
// @Router       /api/users [get]
func handleList(usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		list, err := usersRepo.List(userID, c.Query("search"))
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

// handleGetUser godoc
// @Summary      Get user by ID
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Param        id path int true "User ID"
// @Success      200 {object} apidocs.ProfileSuccess
// @Failure      404 {object} apidocs.ErrorEnvelope
// @Router       /api/users/{id} [get]
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

// handleBlock godoc
// @Summary      Block a user
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body body apidocs.AddMemberRequest true "User ID to block"
// @Success      200 {object} apidocs.OKMessage
// @Failure      400 {object} apidocs.ErrorEnvelope
// @Failure      404 {object} apidocs.ErrorEnvelope
// @Router       /api/users/block [post]
func handleBlock(usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		blockerID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		var req blockBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid or malformed request body")
			return
		}
		if req.UserID == blockerID {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Cannot block yourself")
			return
		}
		target, err := usersRepo.GetByID(req.UserID)
		if err != nil || target == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "User not found")
			return
		}
		if err := usersRepo.Block(blockerID, req.UserID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"message": "User blocked"})
	}
}

// handleUnblock godoc
// @Summary      Unblock a user
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Param        id path int true "User ID to unblock"
// @Success      200 {object} apidocs.OKMessage
// @Failure      401 {object} apidocs.ErrorEnvelope
// @Router       /api/users/block/{id} [delete]
func handleUnblock(usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		blockerID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		id64, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid user ID")
			return
		}
		if err := usersRepo.Unblock(blockerID, uint(id64)); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"message": "User unblocked"})
	}
}

// handleListBlocked godoc
// @Summary      List blocked users
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} apidocs.UsersListSuccess
// @Failure      401 {object} apidocs.ErrorEnvelope
// @Router       /api/users/blocked [get]
func handleListBlocked(usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		list, err := usersRepo.ListBlocked(userID)
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
