package rooms

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/hub"
	"zync-server/internal/repository"
)

func Register(api *gin.RouterGroup, h *hub.Hub, roomsRepo *repository.RoomRepository, usersRepo *repository.UserRepository) {
	api.POST("/rooms/group", handleCreateGroup(h, roomsRepo))
	api.POST("/rooms/direct", handleCreateDirect(h, roomsRepo, usersRepo))
	api.GET("/rooms", handleList(roomsRepo))
	api.GET("/rooms/:id", handleGetRoom(roomsRepo))
	api.PUT("/rooms/:id", handleUpdateRoom(roomsRepo))
	api.PUT("/rooms/:id/pin", handlePinMessage(roomsRepo))
	api.POST("/rooms/:id/members", handleAddMember(roomsRepo, usersRepo))
	api.DELETE("/rooms/:id/members/:userId", handleRemoveMember(roomsRepo))
	api.PUT("/rooms/:id/members/:userId/role", handleChangeMemberRole(roomsRepo))
	api.DELETE("/rooms/:id", handleDeleteRoom(h, roomsRepo))
	api.DELETE("/rooms/:id/leave", handleLeaveRoom(roomsRepo))
	api.POST("/rooms/:id/invite", handleGenerateInvite(roomsRepo))
	api.POST("/invite/:token", handleJoinByInvite(roomsRepo))
}
