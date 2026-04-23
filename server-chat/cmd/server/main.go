// Package main runs the chat API HTTP server.
// @title Chat Server API
// @version 1.0
// @description REST + WebSocket backend for realtime chat (rooms, JWT auth, message history, reactions, notifications).
// @host localhost:8080
// @BasePath /
// @schemes http
//
// API docs served at /docs/ (open-swag-go, Scalar UI)
package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"zync-server/internal/auth"
	"zync-server/internal/config"
	"zync-server/internal/database"
	"zync-server/internal/httpapi"
	"zync-server/internal/hub"
	applogger "zync-server/internal/logger"
	"zync-server/internal/mailer"
	"zync-server/internal/repository"
	"zync-server/internal/scheduler"
)

func main() {
	log := applogger.New()

	cfg, err := config.Load()
	if err != nil {
		log.Error("config", "error", err)
		os.Exit(1)
	}

	db, err := database.Connect(cfg.DatabaseDSN, database.PoolConfig{
		MaxOpenConns:    cfg.DBMaxOpenConns,
		MaxIdleConns:    cfg.DBMaxIdleConns,
		ConnMaxLifetime: cfg.DBConnMaxLifetime,
	})
	if err != nil {
		log.Error("database", "error", err)
		os.Exit(1)
	}

	if err := database.SeedMaintenanceAdmin(db, log); err != nil {
		log.Error("maintenance admin database seed", "error", err)
		os.Exit(1)
	}

	if err := database.SeedOnboardingPricing(db, log); err != nil {
		log.Error("onboarding pricing database seed", "error", err)
		os.Exit(1)
	}

	jwtSvc, err := auth.NewService(cfg.JWTSecret, cfg.JWTTTL)
	if err != nil {
		log.Error("auth", "error", err)
		os.Exit(1)
	}

	msgRepo := repository.NewMessageRepository(db)
	roomRepo := repository.NewRoomRepository(db)
	userRepo := repository.NewUserRepository(db)
	wsRepo := repository.NewWorkspaceRepository(db)
	rtRepo := repository.NewRefreshTokenRepository(db, 0)
	notifRepo := repository.NewNotificationRepository(db)
	taskRepo := repository.NewTaskRepository(db)
	recentRepo := repository.NewRecentTaskRepository(db)
	bookmarkRepo := repository.NewBookmarkRepository(db)
	pushSubRepo := repository.NewPushSubscriptionRepository(db)
	onboardingPricingRepo := repository.NewOnboardingPricingRepository(db)
	subscriptionRepo := repository.NewSubscriptionRepository(db)
	paymentTxnRepo := repository.NewPaymentTransactionRepository(db)
	coinRepo := repository.NewCoinRepository(db)
	stickerRepo := repository.NewStickerRepository(db)
	pollRepo := repository.NewPollRepository(db)
	scheduledMsgRepo := repository.NewScheduledMessageRepository(db)
	coinWithdrawalRepo := repository.NewCoinWithdrawalRepository(db)
	mailSvc := mailer.New(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass, cfg.SMTPFrom)

	if err := database.SeedStickerPacks(db, log); err != nil {
		log.Error("sticker packs seed", "error", err)
		os.Exit(1)
	}

	h := hub.New()
	go h.Run()

	schedulerCtx, schedulerCancel := context.WithCancel(context.Background())
	go scheduler.RunTaskReminders(schedulerCtx, taskRepo, notifRepo, h, log)
	go scheduler.RunScheduledMessages(schedulerCtx, scheduledMsgRepo, msgRepo, h, log)

	r := httpapi.NewRouter(httpapi.Deps{
		Hub:           h,
		Messages:      msgRepo,
		Rooms:         roomRepo,
		Users:         userRepo,
		Workspaces:    wsRepo,
		RecentTasks:   recentRepo,
		RefreshTokens: rtRepo,
		Notifications: notifRepo,
		Tasks:         taskRepo,
		Bookmarks:         bookmarkRepo,
		PushSubscriptions: pushSubRepo,
		Subscriptions:       subscriptionRepo,
		PaymentTransactions: paymentTxnRepo,
		Coins:               coinRepo,
		CoinWithdrawals:     coinWithdrawalRepo,
		Stickers:            stickerRepo,
		Polls:               pollRepo,
		ScheduledMsgs:       scheduledMsgRepo,
		Mailer:              mailSvc,
		OnboardingPricingPlans: onboardingPricingRepo,
		Auth:          jwtSvc,
		Config:        cfg,
		Logger:        log,
	})

	srv := &http.Server{
		Addr:    cfg.Addr,
		Handler: r,
	}

	go func() {
		log.Info("server starting", "addr", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	schedulerCancel()
	h.Shutdown()

	if err := srv.Shutdown(ctx); err != nil {
		log.Error("server shutdown error", "error", err)
	}
	log.Info("server stopped")
}
