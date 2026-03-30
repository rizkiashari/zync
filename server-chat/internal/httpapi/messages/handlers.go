package messages

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

// listMessages godoc
// @Summary      Message history for a room
// @Tags         messages
// @Produce      json
// @Security     BearerAuth
// @Param        id      path  int  true  "Room ID"
// @Param        limit   query int  false "Page size (default 50, max 100)"
// @Param        before_id query int false "Cursor: only messages with id < before_id"
// @Success      200 {object} apidocs.MessagesSuccess
// @Failure      401 {object} apidocs.ErrorEnvelope
// @Failure      403 {object} apidocs.ErrorEnvelope
// @Failure      404 {object} apidocs.ErrorEnvelope
// @Router       /api/rooms/{id}/messages [get]
func listMessages(msgRepo *repository.MessageRepository, roomsRepo *repository.RoomRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		roomID, err := parseID(c, "id")
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidRoom, "roomId must be a positive integer")
			return
		}
		if ok, _ := assertMember(c, roomsRepo, roomID, userID); !ok {
			return
		}
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
		var beforeID uint
		if v := c.Query("before_id"); v != "" {
			u64, err := strconv.ParseUint(v, 10, 64)
			if err != nil {
				response.Error(c, http.StatusBadRequest, response.CodeInvalidBeforeID, "Invalid before_id parameter")
				return
			}
			beforeID = uint(u64)
		}
		msgs, err := msgRepo.ListMessages(roomID, limit, beforeID)
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

// searchMessages godoc
// @Summary      Search messages in a room
// @Tags         messages
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int    true  "Room ID"
// @Param        q     query string true  "Search keyword"
// @Param        limit query int    false "Max results (default 50)"
// @Success      200 {object} apidocs.MessagesSuccess
// @Failure      400 {object} apidocs.ErrorEnvelope
// @Failure      403 {object} apidocs.ErrorEnvelope
// @Router       /api/rooms/{id}/messages/search [get]
func searchMessages(msgRepo *repository.MessageRepository, roomsRepo *repository.RoomRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		roomID, err := parseID(c, "id")
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidRoom, "roomId must be a positive integer")
			return
		}
		if ok, _ := assertMember(c, roomsRepo, roomID, userID); !ok {
			return
		}
		q := c.Query("q")
		if q == "" {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidQuery, "Query parameter q is required")
			return
		}
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
		msgs, err := msgRepo.Search(roomID, q, limit)
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

type editBody struct {
	Body string `json:"body" binding:"required,min=1"`
}

// editMessage godoc
// @Summary      Edit a message
// @Tags         messages
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        msgId path int true "Message ID"
// @Param        body  body apidocs.EditMessageRequest true "New body"
// @Success      200 {object} apidocs.MessageSuccess
// @Failure      403 {object} apidocs.ErrorEnvelope
// @Failure      404 {object} apidocs.ErrorEnvelope
// @Router       /api/messages/{msgId} [put]
func editMessage(msgRepo *repository.MessageRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		msgID, err := parseID(c, "msgId")
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid message ID")
			return
		}
		msg, err := msgRepo.GetByID(msgID)
		if err != nil || msg == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Message not found")
			return
		}
		if msg.SenderID != userID {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "You can only edit your own messages")
			return
		}
		if msg.IsDeleted {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Cannot edit a deleted message")
			return
		}
		var req editBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid or malformed request body")
			return
		}
		if err := msgRepo.EditMessage(msgID, req.Body); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		updated, _ := msgRepo.GetByID(msgID)
		response.OK(c, updated)
	}
}

// deleteMessage godoc
// @Summary      Delete a message (soft delete)
// @Tags         messages
// @Produce      json
// @Security     BearerAuth
// @Param        msgId path int true "Message ID"
// @Success      200 {object} apidocs.OKMessage
// @Failure      403 {object} apidocs.ErrorEnvelope
// @Failure      404 {object} apidocs.ErrorEnvelope
// @Router       /api/messages/{msgId} [delete]
func deleteMessage(msgRepo *repository.MessageRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		msgID, err := parseID(c, "msgId")
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid message ID")
			return
		}
		msg, err := msgRepo.GetByID(msgID)
		if err != nil || msg == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Message not found")
			return
		}
		if msg.SenderID != userID {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "You can only delete your own messages")
			return
		}
		if err := msgRepo.DeleteMessage(msgID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"message": "Message deleted"})
	}
}

type reactionBody struct {
	Emoji string `json:"emoji" binding:"required,min=1,max=32"`
}

// addReaction godoc
// @Summary      Add emoji reaction to a message
// @Tags         messages
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        msgId path int true "Message ID"
// @Param        body  body apidocs.AddReactionRequest true "Emoji"
// @Success      200 {object} apidocs.ReactionsSuccess
// @Failure      404 {object} apidocs.ErrorEnvelope
// @Router       /api/messages/{msgId}/reactions [post]
func addReaction(msgRepo *repository.MessageRepository, roomsRepo *repository.RoomRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		msgID, err := parseID(c, "msgId")
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid message ID")
			return
		}
		msg, err := msgRepo.GetByID(msgID)
		if err != nil || msg == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Message not found")
			return
		}
		if ok, _ := assertMember(c, roomsRepo, msg.RoomID, userID); !ok {
			return
		}
		var req reactionBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid or malformed request body")
			return
		}
		if err := msgRepo.AddReaction(msgID, userID, req.Emoji); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		reactions, _ := msgRepo.GetReactions(msgID)
		response.OK(c, reactions)
	}
}

// removeReaction godoc
// @Summary      Remove emoji reaction from a message
// @Tags         messages
// @Produce      json
// @Security     BearerAuth
// @Param        msgId path int    true "Message ID"
// @Param        emoji path string true "Emoji character"
// @Success      200 {object} apidocs.ReactionsSuccess
// @Failure      404 {object} apidocs.ErrorEnvelope
// @Router       /api/messages/{msgId}/reactions/{emoji} [delete]
func removeReaction(msgRepo *repository.MessageRepository, roomsRepo *repository.RoomRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		msgID, err := parseID(c, "msgId")
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid message ID")
			return
		}
		msg, err := msgRepo.GetByID(msgID)
		if err != nil || msg == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Message not found")
			return
		}
		if ok, _ := assertMember(c, roomsRepo, msg.RoomID, userID); !ok {
			return
		}
		if err := msgRepo.RemoveReaction(msgID, userID, c.Param("emoji")); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		reactions, _ := msgRepo.GetReactions(msgID)
		response.OK(c, reactions)
	}
}

// getReactions godoc
// @Summary      Get reactions for a message
// @Tags         messages
// @Produce      json
// @Security     BearerAuth
// @Param        msgId path int true "Message ID"
// @Success      200 {object} apidocs.ReactionsSuccess
// @Router       /api/messages/{msgId}/reactions [get]
func getReactions(msgRepo *repository.MessageRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		_, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		msgID, err := parseID(c, "msgId")
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid message ID")
			return
		}
		reactions, err := msgRepo.GetReactions(msgID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, reactions)
	}
}

func parseID(c *gin.Context, param string) (uint, error) {
	id64, err := strconv.ParseUint(c.Param(param), 10, 64)
	return uint(id64), err
}

func assertMember(c *gin.Context, roomsRepo *repository.RoomRepository, roomID, userID uint) (bool, error) {
	room, err := roomsRepo.GetByID(roomID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
		return false, err
	}
	if room == nil {
		response.Error(c, http.StatusNotFound, response.CodeNotFound, "Room not found")
		return false, nil
	}
	member, err := roomsRepo.IsMember(roomID, userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
		return false, err
	}
	if !member {
		response.Error(c, http.StatusForbidden, response.CodeForbidden, "You are not a member of this room")
		return false, nil
	}
	return true, nil
}
