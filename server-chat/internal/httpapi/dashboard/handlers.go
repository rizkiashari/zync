package dashboard

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

// handleDashboard godoc
// @Summary      Dashboard overview
// @Tags         dashboard
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} apidocs.DashboardSuccess
// @Failure      401 {object} apidocs.ErrorEnvelope
// @Failure      500 {object} apidocs.ErrorEnvelope
// @Router       /api/dashboard [get]
func handleDashboard(roomsRepo *repository.RoomRepository, usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		workspaceID, _ := middleware.WorkspaceID(c)
		roomCount, onlineCount, err := roomsRepo.GetDashboardStats(userID, workspaceID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		rooms, err := roomsRepo.ListForUserWithPreview(userID, workspaceID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if rooms == nil {
			rooms = make([]repository.RoomWithPreview, 0)
		}
		onlineUsers, err := usersRepo.ListOnline()
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if onlineUsers == nil {
			onlineUsers = make([]models.User, 0)
		}
		response.OK(c, gin.H{
			"stats":        gin.H{"room_count": roomCount, "online_users": onlineCount},
			"rooms":        rooms,
			"online_users": onlineUsers,
		})
	}
}
