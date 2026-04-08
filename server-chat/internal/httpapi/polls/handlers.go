package polls

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"zync-server/internal/hub"
	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

// POST /api/rooms/:room_id/polls
// Body: { "question": "...", "options": ["a","b"], "is_multiple": false, "expires_at": "2024-..." (optional) }
func postCreatePoll(polls *repository.PollRepository, h *hub.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}
		roomID, err := strconv.ParseUint(c.Param("room_id"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid room_id")
			return
		}

		var body struct {
			Question   string     `json:"question"    binding:"required"`
			Options    []string   `json:"options"     binding:"required,min=2"`
			IsMultiple bool       `json:"is_multiple"`
			ExpiresAt  *time.Time `json:"expires_at"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid request body")
			return
		}

		opts := make([]models.PollOption, 0, len(body.Options))
		for _, text := range body.Options {
			t := strings.TrimSpace(text)
			if t == "" {
				continue
			}
			opts = append(opts, models.PollOption{Text: t})
		}
		if len(opts) < 2 {
			response.Error(c, http.StatusBadRequest, "invalid_options", "Poll requires at least 2 non-empty options")
			return
		}

		poll := &models.Poll{
			RoomID:      uint(roomID),
			CreatedByID: uid,
			Question:    strings.TrimSpace(body.Question),
			IsMultiple:  body.IsMultiple,
			ExpiresAt:   body.ExpiresAt,
			Options:     opts,
		}
		if err := polls.Create(poll); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to create poll")
			return
		}

		// Broadcast to room via WebSocket
		_ = h.BroadcastToRoom(fmt.Sprintf("%d", roomID), map[string]any{"type": "poll_created", "poll": poll})

		response.OK(c, gin.H{"poll": poll})
	}
}

// GET /api/rooms/:room_id/polls
func getPolls(polls *repository.PollRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		roomID, err := strconv.ParseUint(c.Param("room_id"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid room_id")
			return
		}
		list, err := polls.GetByRoom(uint(roomID))
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to fetch polls")
			return
		}
		response.OK(c, gin.H{"polls": list})
	}
}

// POST /api/polls/:poll_id/vote
// Body: { "option_id": 3 }
func postVote(polls *repository.PollRepository, h *hub.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}
		pollID, err := strconv.ParseUint(c.Param("poll_id"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid poll_id")
			return
		}
		var body struct {
			OptionID uint `json:"option_id" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "option_id is required")
			return
		}

		if err := polls.Vote(uint(pollID), body.OptionID, uid); err != nil {
			switch {
			case errors.Is(err, repository.ErrAlreadyVoted):
				response.Error(c, http.StatusConflict, "already_voted", "You have already voted")
			case errors.Is(err, repository.ErrPollExpired):
				response.Error(c, http.StatusGone, "poll_expired", "This poll has expired")
			case errors.Is(err, repository.ErrPollNotFound):
				response.Error(c, http.StatusNotFound, "poll_not_found", "Poll not found")
			case errors.Is(err, repository.ErrInvalidOption):
				response.Error(c, http.StatusBadRequest, "invalid_option", "Invalid option")
			default:
				response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to vote")
			}
			return
		}

		// Return updated poll
		poll, _ := polls.GetByID(uint(pollID))
		userVotes, _ := polls.GetUserVotes(uint(pollID), uid)

		// Broadcast updated poll to room
		if poll != nil {
			_ = h.BroadcastToRoom(fmt.Sprintf("%d", poll.RoomID), map[string]any{
				"type":         "poll_updated",
				"poll":         poll,
				"voter_id":     uid,
				"voted_option": body.OptionID,
			})
		}

		response.OK(c, gin.H{
			"poll":       poll,
			"user_votes": userVotes,
		})
	}
}

// GET /api/polls/:poll_id/my-votes
func getMyVotes(polls *repository.PollRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}
		pollID, err := strconv.ParseUint(c.Param("poll_id"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid poll_id")
			return
		}
		votes, err := polls.GetUserVotes(uint(pollID), uid)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to get votes")
			return
		}
		response.OK(c, gin.H{"voted_option_ids": votes})
	}
}

// DELETE /api/polls/:poll_id
func deletePoll(polls *repository.PollRepository, h *hub.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.UserID(c)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, response.CodeInvalidToken, "Unauthorized")
			return
		}
		pollID, err := strconv.ParseUint(c.Param("poll_id"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid poll_id")
			return
		}

		// Get poll to know the room before deleting
		poll, getErr := polls.GetByID(uint(pollID))
		if getErr != nil {
			response.Error(c, http.StatusNotFound, "poll_not_found", "Poll not found")
			return
		}

		if err := polls.Delete(uint(pollID), uid); err != nil {
			if err.Error() == "forbidden" {
				response.Error(c, http.StatusForbidden, "forbidden", "Only the poll creator can delete it")
			} else {
				response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Failed to delete poll")
			}
			return
		}

		_ = h.BroadcastToRoom(fmt.Sprintf("%d", poll.RoomID), map[string]any{"type": "poll_deleted", "poll_id": pollID})
		response.OK(c, gin.H{"deleted": true})
	}
}
