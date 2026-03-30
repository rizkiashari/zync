package users

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/repository"
)

func Register(api *gin.RouterGroup, usersRepo *repository.UserRepository) {
	api.GET("/users", handleList(usersRepo))
	api.GET("/users/:id", handleGetUser(usersRepo))
	api.POST("/users/block", handleBlock(usersRepo))
	api.DELETE("/users/block/:id", handleUnblock(usersRepo))
	api.GET("/users/blocked", handleListBlocked(usersRepo))
}
