package realtime

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"zync-server/internal/auth"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/hub"
	"zync-server/internal/repository"
	chatws "zync-server/internal/transport/websocket"
)

// handleNotifyWS upgrades a persistent connection for cross-room notifications (unread badges).
// It also owns the user's global online/offline presence.
func handleNotifyWS(h *hub.Hub, usersRepo *repository.UserRepository, jwtSvc *auth.Service, allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := tokenFromRequest(c.Request)
		if token == "" {
			abortUnauthorized(c)
			return
		}
		userID, err := jwtSvc.ParseUserID(token)
		if err != nil {
			abortUnauthorized(c)
			return
		}
		chatws.ServeNotify(h, usersRepo, c.Writer, c.Request, userID, allowedOrigins)
	}
}

// handleWebSocket godoc
// @Summary WebSocket chat connection
// @Description Upgrade to WebSocket after JWT validation (membership checked). Send JSON: {"type":"chat","text":"..."}. Incoming events use JSON with id, from, room, text, sent_at.
// @Tags realtime
// @Security BearerAuth
// @Param room query int true "Room ID"
// @Param token query string false "JWT alternative to Authorization header (mobile/tools)"
// @Failure 400 {object} apidocs.ErrorEnvelope
// @Failure 401 {object} apidocs.ErrorEnvelope
// @Failure 403 {object} apidocs.ErrorEnvelope
// @Failure 404 {object} apidocs.ErrorEnvelope
// @Failure 500 {object} apidocs.ErrorEnvelope
// @Router /ws [get]
func handleWebSocket(
	h *hub.Hub,
	msgRepo *repository.MessageRepository,
	roomsRepo *repository.RoomRepository,
	usersRepo *repository.UserRepository,
	wsRepo *repository.WorkspaceRepository,
	jwtSvc *auth.Service,
	allowedOrigins []string,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := tokenFromRequest(c.Request)
		if token == "" {
			abortUnauthorized(c)
			return
		}
		userID, err := jwtSvc.ParseUserID(token)
		if err != nil {
			abortUnauthorized(c)
			return
		}
		roomStr := c.Query("room")
		if roomStr == "" {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidRoom, "Query parameter room is required (numeric room id)")
			return
		}
		roomID64, err := strconv.ParseUint(roomStr, 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidRoom, "room must be a positive integer")
			return
		}
		roomID := uint(roomID64)
		room, err := roomsRepo.GetByID(roomID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if room == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Room not found")
			return
		}
		member, err := roomsRepo.IsMember(roomID, userID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if !member {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "You are not a member of this room")
			return
		}
		// Workspace isolation: user must be a workspace member unless superadmin.
		if room.WorkspaceID != 0 {
			wsMember, err2 := wsRepo.IsMember(room.WorkspaceID, userID)
			if err2 != nil || !wsMember {
				u2, _ := usersRepo.GetByID(userID)
				if u2 == nil || !u2.IsSystemAdmin {
					response.Error(c, http.StatusForbidden, response.CodeForbidden, "Access denied: workspace mismatch")
					return
				}
			}
		}
		statusMessage := ""
		if u, err2 := usersRepo.GetByID(userID); err2 == nil && u != nil {
			statusMessage = u.StatusMessage
		}
		chatws.Serve(h, msgRepo, usersRepo, roomsRepo, c.Writer, c.Request, userID, roomID, statusMessage, allowedOrigins)
	}
}
