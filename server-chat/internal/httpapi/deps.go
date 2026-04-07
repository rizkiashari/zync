package httpapi

import (
	"log/slog"

	"zync-server/internal/auth"
	"zync-server/internal/config"
	"zync-server/internal/hub"
	"zync-server/internal/mailer"
	"zync-server/internal/repository"
)

type Deps struct {
	Hub           *hub.Hub
	Messages      *repository.MessageRepository
	Rooms         *repository.RoomRepository
	Users         *repository.UserRepository
	Workspaces    *repository.WorkspaceRepository
	RecentTasks   *repository.RecentTaskRepository
	OnboardingPricingPlans *repository.OnboardingPricingRepository
	RefreshTokens *repository.RefreshTokenRepository
	Notifications *repository.NotificationRepository
	Tasks         *repository.TaskRepository
	Bookmarks         *repository.BookmarkRepository
	Subscriptions        *repository.SubscriptionRepository
	PaymentTransactions  *repository.PaymentTransactionRepository
	PushSubscriptions *repository.PushSubscriptionRepository
	Coins         *repository.CoinRepository
	Stickers      *repository.StickerRepository
	Auth          *auth.Service
	Mailer        *mailer.Mailer
	Config        *config.Config
	Logger        *slog.Logger
}
