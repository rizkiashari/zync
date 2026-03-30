package database

import (
	"fmt"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"zync-server/internal/models"
)

// PoolConfig holds database connection pool settings.
type PoolConfig struct {
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// Connect opens PostgreSQL and runs AutoMigrate for all models.
func Connect(dsn string, pool PoolConfig) (*gorm.DB, error) {
	if dsn == "" {
		return nil, fmt.Errorf("database DSN is empty")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get sql.DB: %w", err)
	}
	sqlDB.SetMaxOpenConns(pool.MaxOpenConns)
	sqlDB.SetMaxIdleConns(pool.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(pool.ConnMaxLifetime)

	preMigrate(db)

	if err := db.AutoMigrate(
		&models.Workspace{},
		&models.WorkspaceMember{},
		&models.User{},
		&models.UserBlock{},
		&models.RefreshToken{},
		&models.Room{},
		&models.RoomMember{},
		&models.RoomRead{},
		&models.Message{},
		&models.MessageReaction{},
		&models.Notification{},
		&models.TaskBoard{},
		&models.TaskColumn{},
		&models.Task{},
		&models.TaskAssignee{},
		&models.RecentTask{},
	); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return db, nil
}

// preMigrate cleans up legacy data that would block AutoMigrate column type changes.
// Runs silently — errors are expected when tables don't exist yet.
func preMigrate(db *gorm.DB) {
	silent := db.Session(&gorm.Session{
		Logger: logger.Default.LogMode(logger.Silent),
	})

	// Remove messages where room_id is a non-numeric string (e.g. old "general" string rooms).
	silent.Exec(`DELETE FROM messages WHERE room_id::text !~ '^[0-9]+$'`)

	// Remove room_members where room_id is a non-numeric string.
	silent.Exec(`DELETE FROM room_members WHERE room_id::text !~ '^[0-9]+$'`)
}
