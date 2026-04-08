package polls

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/hub"
	"zync-server/internal/repository"
)

// Register mounts poll endpoints under workspace-scoped group (Bearer + Tenant).
func Register(g *gin.RouterGroup, polls *repository.PollRepository, h *hub.Hub) {
	// Room-scoped
	g.POST("/rooms/:room_id/polls", postCreatePoll(polls, h))
	g.GET("/rooms/:room_id/polls", getPolls(polls))

	// Poll-scoped
	g.POST("/polls/:poll_id/vote", postVote(polls, h))
	g.GET("/polls/:poll_id/my-votes", getMyVotes(polls))
	g.DELETE("/polls/:poll_id", deletePoll(polls, h))
}
