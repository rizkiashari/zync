package messages

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/repository"
)

func Register(api *gin.RouterGroup, msgRepo *repository.MessageRepository, roomsRepo *repository.RoomRepository) {
	// Uses :id to match the same wildcard as /api/rooms/:id defined in rooms package.
	api.GET("/rooms/:id/messages", listMessages(msgRepo, roomsRepo))
	api.GET("/rooms/:id/messages/search", searchMessages(msgRepo, roomsRepo))
	api.GET("/rooms/:id/files", listFiles(msgRepo, roomsRepo))
	api.GET("/messages/:msgId", getMessage(msgRepo))
	api.GET("/messages/:msgId/thread", getThread(msgRepo))
	api.PUT("/messages/:msgId", editMessage(msgRepo))
	api.DELETE("/messages/:msgId", deleteMessage(msgRepo))
	api.GET("/messages/:msgId/reactions", getReactions(msgRepo))
	api.POST("/messages/:msgId/reactions", addReaction(msgRepo, roomsRepo))
	api.DELETE("/messages/:msgId/reactions/:emoji", removeReaction(msgRepo, roomsRepo))
}
