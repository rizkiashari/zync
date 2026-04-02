package workspacefiles

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

// handleList godoc
// @Summary      List all files in a workspace
// @Tags         workspace-files
// @Produce      json
// @Security     BearerAuth
// @Param        id       path  int    true  "Workspace ID"
// @Param        room_id  query int    false "Filter by room (0 = all)"
// @Param        mime     query string false "MIME prefix filter (e.g. image/, application/pdf)"
// @Param        q        query string false "Search filename"
// @Param        limit    query int    false "Max results (default 50)"
// @Param        offset   query int    false "Pagination offset"
// @Success      200 {object} apidocs.MessagesSuccess
// @Failure      401 {object} apidocs.ErrorEnvelope
// @Router       /api/workspaces/{id}/files [get]
func handleList(msgRepo *repository.MessageRepository, wsRepo *repository.WorkspaceRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}

		wsID, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid workspace ID")
			return
		}

		// Verify workspace membership
		member, err := wsRepo.IsMember(uint(wsID), userID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if !member {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Not a member of this workspace")
			return
		}

		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
		offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
		roomID, _ := strconv.ParseUint(c.Query("room_id"), 10, 64)
		mimePrefix := strings.TrimSpace(c.Query("mime"))
		search := strings.TrimSpace(c.Query("q"))

		msgs, err := msgRepo.ListWorkspaceFiles(uint(wsID), userID, uint(roomID), mimePrefix, search, limit, offset)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if msgs == nil {
			msgs = make([]models.Message, 0)
		}
		response.OK(c, msgs)
	}
}
