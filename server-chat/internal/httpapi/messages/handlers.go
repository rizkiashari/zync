package messages

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"zync-server/internal/hub"
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
		if len(msgs) == 0 {
			response.OK(c, []repository.MessageWithReactions{})
			return
		}
		// Collect message IDs for bulk reaction fetch
		msgIDs := make([]uint, len(msgs))
		for i, m := range msgs {
			msgIDs[i] = m.ID
		}
		rxMap, _ := msgRepo.GetBulkReactionsForUser(msgIDs, userID)
		out := make([]repository.MessageWithReactions, len(msgs))
		for i, m := range msgs {
			rxs := rxMap[m.ID]
			if rxs == nil {
				rxs = []repository.ReactionSummaryWithMe{}
			}
			out[i] = repository.MessageWithReactions{Message: m, Reactions: rxs}
		}
		response.OK(c, out)
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

func listFiles(msgRepo *repository.MessageRepository, roomsRepo *repository.RoomRepository) gin.HandlerFunc {
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
		offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
		msgs, err := msgRepo.ListFiles(roomID, limit, offset)
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

// getMessage godoc
// @Summary      Get a single message by ID
// @Tags         messages
// @Produce      json
// @Security     BearerAuth
// @Param        msgId path int true "Message ID"
// @Success      200 {object} apidocs.MessageSuccess
// @Failure      404 {object} apidocs.ErrorEnvelope
// @Router       /api/messages/{msgId} [get]
func getMessage(msgRepo *repository.MessageRepository) gin.HandlerFunc {
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
		msg, err := msgRepo.GetByID(msgID)
		if err != nil || msg == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Message not found")
			return
		}
		response.OK(c, msg)
	}
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
func addReaction(msgRepo *repository.MessageRepository, roomsRepo *repository.RoomRepository, h *hub.Hub) gin.HandlerFunc {
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
		// Broadcast without reacted_by_me (varies per recipient)
		broadcastRxs, _ := msgRepo.GetReactions(msgID)
		_ = h.BroadcastToRoom(strconv.FormatUint(uint64(msg.RoomID), 10), gin.H{
			"type":       "reaction_updated",
			"message_id": msgID,
			"reactions":  broadcastRxs,
			"user_id":    userID,
		})
		// Return personalized view to the requesting user
		myRxs, _ := msgRepo.GetReactionsForUser(msgID, userID)
		response.OK(c, myRxs)
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
func removeReaction(msgRepo *repository.MessageRepository, roomsRepo *repository.RoomRepository, h *hub.Hub) gin.HandlerFunc {
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
		broadcastRxs, _ := msgRepo.GetReactions(msgID)
		_ = h.BroadcastToRoom(strconv.FormatUint(uint64(msg.RoomID), 10), gin.H{
			"type":       "reaction_updated",
			"message_id": msgID,
			"reactions":  broadcastRxs,
			"user_id":    userID,
		})
		myRxs, _ := msgRepo.GetReactionsForUser(msgID, userID)
		response.OK(c, myRxs)
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

// getThread godoc
// @Summary      Get thread replies for a message
// @Tags         messages
// @Produce      json
// @Security     BearerAuth
// @Param        msgId    path  int  true  "Parent message ID"
// @Param        limit    query int  false "Page size (default 50)"
// @Param        before_id query int false "Cursor: only replies with id < before_id"
// @Success      200 {object} apidocs.MessagesSuccess
// @Failure      401 {object} apidocs.ErrorEnvelope
// @Failure      404 {object} apidocs.ErrorEnvelope
// @Router       /api/messages/{msgId}/thread [get]
func getThread(msgRepo *repository.MessageRepository) gin.HandlerFunc {
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
		parent, err := msgRepo.GetByID(msgID)
		if err != nil || parent == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Message not found")
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
		replies, err := msgRepo.GetThread(msgID, limit, beforeID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if replies == nil {
			replies = make([]models.Message, 0)
		}
		response.OK(c, gin.H{
			"parent":  parent,
			"replies": replies,
		})
	}
}

// forwardMessage godoc
// POST /api/messages/:msgId/forward
// Body: { "room_ids": [1, 2] }
func forwardMessage(msgRepo *repository.MessageRepository, roomsRepo *repository.RoomRepository, h *hub.Hub) gin.HandlerFunc {
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
		var body struct {
			RoomIDs []uint `json:"room_ids" binding:"required,min=1"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "room_ids is required")
			return
		}
		// Verify user is member of all target rooms
		for _, rid := range body.RoomIDs {
			if ok, _ := assertMember(c, roomsRepo, rid, userID); !ok {
				return
			}
		}
		newIDs, err := msgRepo.Forward(msgID, userID, body.RoomIDs)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to forward message")
			return
		}
		// Broadcast to each target room
		orig, _ := msgRepo.GetByID(msgID)
		for i, rid := range body.RoomIDs {
			if i < len(newIDs) {
				_ = h.BroadcastToRoom(strconv.FormatUint(uint64(rid), 10), gin.H{
					"type":    "new_message",
					"message": gin.H{"id": newIDs[i], "room_id": rid, "sender_id": userID, "body": orig.Body, "forwarded_from_id": msgID},
				})
			}
		}
		response.OK(c, gin.H{"forwarded_message_ids": newIDs})
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
