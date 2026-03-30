package bookmarks

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/repository"
)

func Register(api *gin.RouterGroup, bmRepo *repository.BookmarkRepository, msgRepo *repository.MessageRepository) {
	api.GET("/bookmarks", handleListBookmarks(bmRepo))
	api.POST("/messages/:msgId/bookmark", handleAddBookmark(bmRepo, msgRepo))
	api.DELETE("/messages/:msgId/bookmark", handleRemoveBookmark(bmRepo))
}
