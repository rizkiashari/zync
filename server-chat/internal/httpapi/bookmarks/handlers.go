package bookmarks

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/repository"
)

func handleAddBookmark(bmRepo *repository.BookmarkRepository, msgRepo *repository.MessageRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		msgIDStr := c.Param("msgId")
		msgID64, err := strconv.ParseUint(msgIDStr, 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid message ID")
			return
		}
		msgID := uint(msgID64)
		msg, err := msgRepo.GetByID(msgID)
		if err != nil || msg == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Message not found")
			return
		}
		if err := bmRepo.Add(userID, msgID, msg.RoomID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"bookmarked": true})
	}
}

func handleRemoveBookmark(bmRepo *repository.BookmarkRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		msgIDStr := c.Param("msgId")
		msgID64, err := strconv.ParseUint(msgIDStr, 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid message ID")
			return
		}
		if err := bmRepo.Remove(userID, uint(msgID64)); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"bookmarked": false})
	}
}

func handleListBookmarks(bmRepo *repository.BookmarkRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		items, err := bmRepo.List(userID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, items)
	}
}
