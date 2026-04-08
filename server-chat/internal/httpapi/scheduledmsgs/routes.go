package scheduledmsgs

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/repository"
)

// Register mounts scheduled message endpoints under workspace-scoped group.
func Register(g *gin.RouterGroup, sched *repository.ScheduledMessageRepository) {
	g.POST("/rooms/:id/scheduled-messages", postSchedule(sched))
	g.GET("/rooms/:id/scheduled-messages", getScheduled(sched))
	g.DELETE("/scheduled-messages/:id", deleteScheduled(sched))
}
