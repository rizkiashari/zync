package notifications

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

// handleList godoc
// @Summary      List notifications
// @Tags         notifications
// @Produce      json
// @Security     BearerAuth
// @Param        limit query int false "Max results (default 50)"
// @Success      200 {object} apidocs.NotificationsSuccess
// @Failure      401 {object} apidocs.ErrorEnvelope
// @Router       /api/notifications [get]
func handleList(notifRepo *repository.NotificationRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
		list, err := notifRepo.List(userID, limit)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		unread, _ := notifRepo.CountUnread(userID)
		if list == nil {
			list = make([]models.Notification, 0)
		}
		response.OK(c, gin.H{"notifications": list, "unread_count": unread})
	}
}

// handleMarkAllRead godoc
// @Summary      Mark all notifications as read
// @Tags         notifications
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} apidocs.OKMessage
// @Failure      401 {object} apidocs.ErrorEnvelope
// @Router       /api/notifications/read [put]
func handleMarkAllRead(notifRepo *repository.NotificationRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		if err := notifRepo.MarkAllRead(userID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"message": "All notifications marked as read"})
	}
}

// handleMarkRead godoc
// @Summary      Mark one notification as read
// @Tags         notifications
// @Produce      json
// @Security     BearerAuth
// @Param        id path int true "Notification ID"
// @Success      200 {object} apidocs.OKMessage
// @Failure      401 {object} apidocs.ErrorEnvelope
// @Router       /api/notifications/{id}/read [put]
func handleMarkRead(notifRepo *repository.NotificationRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		id64, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid notification ID")
			return
		}
		if err := notifRepo.MarkRead(uint(id64), userID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"message": "Notification marked as read"})
	}
}
