package profile

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/repository"
)

// Register mounts profile routes under api (group should already use auth middleware).
func Register(api *gin.RouterGroup, usersRepo *repository.UserRepository, uploadsDir string) {
	api.GET("/profile", handleGetProfile(usersRepo))
	api.PUT("/profile", handleUpdateProfile(usersRepo))
	api.POST("/profile/avatar", handleUploadAvatar(uploadsDir))
	api.PUT("/profile/password", handleChangePassword(usersRepo))
	api.PUT("/profile/status", handleUpdateStatus(usersRepo))
}
