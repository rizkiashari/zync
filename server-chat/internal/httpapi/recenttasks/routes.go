package recenttasks

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/repository"
)

func Register(api *gin.RouterGroup, recentRepo *repository.RecentTaskRepository) {
	api.GET("/recent-tasks", list(recentRepo))
	api.POST("/recent-tasks", upsert(recentRepo))
	api.PUT("/recent-tasks/reorder", reorder(recentRepo))
}

