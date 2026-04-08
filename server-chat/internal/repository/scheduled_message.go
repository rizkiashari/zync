package repository

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"zync-server/internal/models"
)

var ErrNotFound = errors.New("not found")

type ScheduledMessageRepository struct {
	db *gorm.DB
}

func NewScheduledMessageRepository(db *gorm.DB) *ScheduledMessageRepository {
	return &ScheduledMessageRepository{db: db}
}

// Create schedules a new message.
func (r *ScheduledMessageRepository) Create(msg *models.ScheduledMessage) error {
	return r.db.Create(msg).Error
}

// ListByRoom returns pending scheduled messages for a room ordered by scheduled_at ASC.
func (r *ScheduledMessageRepository) ListByRoom(roomID uint) ([]models.ScheduledMessage, error) {
	var rows []models.ScheduledMessage
	err := r.db.
		Where("room_id = ? AND status = ?", roomID, models.ScheduledMsgPending).
		Order("scheduled_at ASC").
		Find(&rows).Error
	if rows == nil {
		rows = []models.ScheduledMessage{}
	}
	return rows, err
}

// ListByUser returns all scheduled messages (any status) created by a user, newest first.
func (r *ScheduledMessageRepository) ListByUser(userID uint) ([]models.ScheduledMessage, error) {
	var rows []models.ScheduledMessage
	err := r.db.
		Where("sender_id = ?", userID).
		Order("scheduled_at DESC").
		Find(&rows).Error
	if rows == nil {
		rows = []models.ScheduledMessage{}
	}
	return rows, err
}

// Cancel marks a scheduled message as cancelled (only by its sender).
func (r *ScheduledMessageRepository) Cancel(id, senderID uint) error {
	result := r.db.Model(&models.ScheduledMessage{}).
		Where("id = ? AND sender_id = ? AND status = ?", id, senderID, models.ScheduledMsgPending).
		Update("status", models.ScheduledMsgCancelled)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

// PollDue returns all pending messages whose scheduled_at <= now.
func (r *ScheduledMessageRepository) PollDue() ([]models.ScheduledMessage, error) {
	var rows []models.ScheduledMessage
	err := r.db.
		Where("status = ? AND scheduled_at <= ?", models.ScheduledMsgPending, time.Now().UTC()).
		Find(&rows).Error
	if rows == nil {
		rows = []models.ScheduledMessage{}
	}
	return rows, err
}

// MarkSent updates status to sent and records the resulting message ID.
func (r *ScheduledMessageRepository) MarkSent(id uint, sentMsgID uint) error {
	return r.db.Model(&models.ScheduledMessage{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"status":      models.ScheduledMsgSent,
			"sent_msg_id": sentMsgID,
		}).Error
}

// MarkFailed updates status to failed.
func (r *ScheduledMessageRepository) MarkFailed(id uint) error {
	return r.db.Model(&models.ScheduledMessage{}).
		Where("id = ?", id).
		Update("status", models.ScheduledMsgFailed).Error
}
