package httpapi

import (
	"log/slog"

	"zync-server/internal/auth"
	"zync-server/internal/config"
	"zync-server/internal/hub"
	"zync-server/internal/repository"
)

type Deps struct {
	Hub           *hub.Hub
	Messages      *repository.MessageRepository
	Rooms         *repository.RoomRepository
	Users         *repository.UserRepository
	Workspaces    *repository.WorkspaceRepository
	RecentTasks   *repository.RecentTaskRepository
	RefreshTokens *repository.RefreshTokenRepository
	Notifications *repository.NotificationRepository
	Tasks         *repository.TaskRepository
	Auth          *auth.Service
	Config        *config.Config
	Logger        *slog.Logger
}
