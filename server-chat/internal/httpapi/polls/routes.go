package polls

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/hub"
	"zync-server/internal/repository"
)

// Register mounts poll endpoints under workspace-scoped group (Bearer + Tenant).
func Register(g *gin.RouterGroup, polls *repository.PollRepository, h *hub.Hub) {
	// Room-scoped — param name :id must match /rooms/:id used by rooms + messages (gin/httprouter).
	g.POST("/rooms/:id/polls", postCreatePoll(polls, h))
	g.GET("/rooms/:id/polls", getPolls(polls))

	// Poll-scoped
	g.POST("/polls/:poll_id/vote", postVote(polls, h))
	g.GET("/polls/:poll_id/my-votes", getMyVotes(polls))
	g.DELETE("/polls/:poll_id", deletePoll(polls, h))
}
