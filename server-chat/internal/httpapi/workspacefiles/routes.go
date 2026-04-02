package workspacefiles

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/repository"
)

func Register(api *gin.RouterGroup, msgRepo *repository.MessageRepository, wsRepo *repository.WorkspaceRepository) {
	api.GET("/workspaces/:id/files", handleList(msgRepo, wsRepo))
}
