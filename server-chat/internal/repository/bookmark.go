package repository

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"zync-server/internal/models"
)

type BookmarkRepository struct {
	db *gorm.DB
}

func NewBookmarkRepository(db *gorm.DB) *BookmarkRepository {
	return &BookmarkRepository{db: db}
}

// BookmarkWithMessage holds a bookmark enriched with its message data.
type BookmarkWithMessage struct {
	BookmarkID uint      `json:"bookmark_id"`
	BookmarkAt time.Time `json:"bookmark_at"`
	RoomID     uint      `json:"room_id"`
	MessageID  uint      `json:"message_id"`
	Body       string    `json:"body"`
	SenderID   uint      `json:"sender_id"`
	CreatedAt  time.Time `json:"created_at"`
}

func (r *BookmarkRepository) Add(userID, messageID, roomID uint) error {
	bm := models.MessageBookmark{
		UserID:    userID,
		MessageID: messageID,
		RoomID:    roomID,
	}
	err := r.db.Create(&bm).Error
	if err != nil && errors.Is(err, gorm.ErrDuplicatedKey) {
		return nil // already bookmarked — idempotent
	}
	return err
}

func (r *BookmarkRepository) Remove(userID, messageID uint) error {
	return r.db.Where("user_id = ? AND message_id = ?", userID, messageID).
		Delete(&models.MessageBookmark{}).Error
}

func (r *BookmarkRepository) IsBookmarked(userID, messageID uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.MessageBookmark{}).
		Where("user_id = ? AND message_id = ?", userID, messageID).
		Count(&count).Error
	return count > 0, err
}

func (r *BookmarkRepository) List(userID uint) ([]BookmarkWithMessage, error) {
	var results []BookmarkWithMessage
	err := r.db.Raw(`
		SELECT mb.id AS bookmark_id, mb.created_at AS bookmark_at,
		       mb.room_id, mb.message_id,
		       m.body, m.sender_id, m.created_at
		FROM message_bookmarks mb
		JOIN messages m ON m.id = mb.message_id
		WHERE mb.user_id = ? AND m.is_deleted = false
		ORDER BY mb.created_at DESC
	`, userID).Scan(&results).Error
	if results == nil {
		results = []BookmarkWithMessage{}
	}
	return results, err
}
