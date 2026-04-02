package repository

import (
	"time"

	"gorm.io/gorm"

	"zync-server/internal/models"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

// Create stores a new notification.
func (r *NotificationRepository) Create(userID uint, nType string, roomID, messageID, fromID uint, body string) error {
	n := models.Notification{
		UserID:    userID,
		Type:      nType,
		RoomID:    roomID,
		MessageID: messageID,
		FromID:    fromID,
		Body:      body,
	}
	return r.db.Create(&n).Error
}

// CreateIfNotDND stores a notification only when the target user has DND mode off.
func (r *NotificationRepository) CreateIfNotDND(userID uint, nType string, roomID, messageID, fromID uint, body string) error {
	var u models.User
	if err := r.db.Select("is_dnd").First(&u, userID).Error; err != nil {
		return err
	}
	if u.IsDND {
		return nil
	}
	return r.Create(userID, nType, roomID, messageID, fromID, body)
}

// List returns notifications for a user, newest first.
func (r *NotificationRepository) List(userID uint, limit int) ([]models.Notification, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	var notes []models.Notification
	err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Limit(limit).Find(&notes).Error
	return notes, err
}

// CountUnread returns the number of unread notifications for a user.
func (r *NotificationRepository) CountUnread(userID uint) (int64, error) {
	var n int64
	err := r.db.Model(&models.Notification{}).Where("user_id = ? AND read_at IS NULL", userID).Count(&n).Error
	return n, err
}

// MarkAllRead marks all unread notifications for a user as read.
func (r *NotificationRepository) MarkAllRead(userID uint) error {
	now := time.Now().UTC()
	return r.db.Model(&models.Notification{}).
		Where("user_id = ? AND read_at IS NULL", userID).
		Update("read_at", now).Error
}

// MarkRead marks a single notification as read.
func (r *NotificationRepository) MarkRead(id, userID uint) error {
	now := time.Now().UTC()
	return r.db.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("read_at", now).Error
}
