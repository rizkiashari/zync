package scheduledmsgs

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

// POST /api/rooms/:id/scheduled-messages
// Body: { "content": "...", "scheduled_at": "2024-...", "reply_to_id": null }
func postSchedule(sched *repository.ScheduledMessageRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}
		roomID, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid room id")
			return
		}

		var body struct {
			Content     string     `json:"content"       binding:"required"`
			ScheduledAt time.Time  `json:"scheduled_at"  binding:"required"`
			ReplyToID   *uint      `json:"reply_to_id"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid request body")
			return
		}

		if body.ScheduledAt.Before(time.Now().UTC().Add(30 * time.Second)) {
			response.Error(c, http.StatusBadRequest, "invalid_time", "scheduled_at must be at least 30 seconds in the future")
			return
		}

		msg := &models.ScheduledMessage{
			RoomID:      uint(roomID),
			SenderID:    uid,
			Content:     strings.TrimSpace(body.Content),
			ReplyToID:   body.ReplyToID,
			ScheduledAt: body.ScheduledAt.UTC(),
		}
		if err := sched.Create(msg); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to schedule message")
			return
		}
		response.OK(c, gin.H{"scheduled_message": msg})
	}
}

// GET /api/rooms/:id/scheduled-messages
func getScheduled(sched *repository.ScheduledMessageRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}
		roomID, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid room id")
			return
		}
		_ = uid // future: filter by sender or admin
		list, err := sched.ListByRoom(uint(roomID))
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to fetch scheduled messages")
			return
		}
		response.OK(c, gin.H{"scheduled_messages": list})
	}
}

// DELETE /api/scheduled-messages/:id
func deleteScheduled(sched *repository.ScheduledMessageRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}
		id, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid id")
			return
		}
		if err := sched.Cancel(uint(id), uid); err != nil {
			response.Error(c, http.StatusNotFound, "not_found", "Scheduled message not found or already sent")
			return
		}
		response.OK(c, gin.H{"cancelled": true})
	}
}
