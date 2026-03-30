// Package main runs the chat API HTTP server.
// @title Chat Server API
// @version 1.0
// @description REST + WebSocket backend for realtime chat (rooms, JWT auth, message history, reactions, notifications).
// @host localhost:8080
// @BasePath /
// @schemes http
//
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description JWT access token. Format: Bearer followed by a space and the token value.
//
// Regenerate API docs from module root: swag init -g cmd/server/main.go -d . -o docs --parseInternal
package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "zync-server/docs"

	"zync-server/internal/auth"
	"zync-server/internal/config"
	"zync-server/internal/database"
	"zync-server/internal/httpapi"
	"zync-server/internal/hub"
	applogger "zync-server/internal/logger"
	"zync-server/internal/repository"
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

	h := hub.New()
	go h.Run()

	r := httpapi.NewRouter(httpapi.Deps{
		Hub:           h,
		Messages:      msgRepo,
		Rooms:         roomRepo,
		Users:         userRepo,
		Workspaces:    wsRepo,
		RefreshTokens: rtRepo,
		Notifications: notifRepo,
		Tasks:         taskRepo,
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

	h.Shutdown()

	if err := srv.Shutdown(ctx); err != nil {
		log.Error("server shutdown error", "error", err)
	}
	log.Info("server stopped")
}
