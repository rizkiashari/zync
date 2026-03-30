package repository

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"zync-server/internal/models"
)

type MessageRepository struct {
	db *gorm.DB
}

func NewMessageRepository(db *gorm.DB) *MessageRepository {
	return &MessageRepository{db: db}
}

func (r *MessageRepository) SaveMessage(roomID, senderID uint, body string, createdAt time.Time) (uint, error) {
	m := models.Message{
		RoomID:    roomID,
		SenderID:  senderID,
		Body:      body,
		CreatedAt: createdAt,
	}
	if err := r.db.Create(&m).Error; err != nil {
		return 0, err
	}
	return m.ID, nil
}

// SaveMessageWithReply persists a chat message that replies to another message.
func (r *MessageRepository) SaveMessageWithReply(roomID, senderID uint, body string, replyToID uint, createdAt time.Time) (uint, error) {
	m := models.Message{
		RoomID:    roomID,
		SenderID:  senderID,
		Body:      body,
		ReplyToID: &replyToID,
		CreatedAt: createdAt,
	}
	if err := r.db.Create(&m).Error; err != nil {
		return 0, err
	}
	return m.ID, nil
}

// ListMessages returns messages oldest-first. beforeID loads only rows with id < beforeID (pagination up).
func (r *MessageRepository) ListMessages(roomID uint, limit int, beforeID uint) ([]models.Message, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	var msgs []models.Message
	q := r.db.Where("room_id = ? AND is_deleted = false", roomID).Order("id DESC").Limit(limit)
	if beforeID > 0 {
		q = q.Where("id < ?", beforeID)
	}
	if err := q.Find(&msgs).Error; err != nil {
		return nil, err
	}
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, nil
}

// GetByID fetches a single message.
func (r *MessageRepository) GetByID(id uint) (*models.Message, error) {
	var m models.Message
	err := r.db.First(&m, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &m, nil
}

// EditMessage updates the body of a message and sets edited_at.
func (r *MessageRepository) EditMessage(id uint, body string) error {
	now := time.Now().UTC()
	return r.db.Model(&models.Message{}).Where("id = ?", id).Updates(map[string]any{
		"body":      body,
		"edited_at": now,
	}).Error
}

// DeleteMessage soft-deletes a message by setting is_deleted = true and clearing body.
func (r *MessageRepository) DeleteMessage(id uint) error {
	return r.db.Model(&models.Message{}).Where("id = ?", id).Updates(map[string]any{
		"is_deleted": true,
		"body":       "",
	}).Error
}

// Search returns messages in a room matching a keyword (case-insensitive full-text search).
func (r *MessageRepository) Search(roomID uint, query string, limit int) ([]models.Message, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	like := "%" + strings.TrimSpace(query) + "%"
	var msgs []models.Message
	err := r.db.Where("room_id = ? AND is_deleted = false AND body ILIKE ?", roomID, like).
		Order("id DESC").Limit(limit).Find(&msgs).Error
	if err != nil {
		return nil, err
	}
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, nil
}

// AddReaction adds an emoji reaction from a user to a message (idempotent).
func (r *MessageRepository) AddReaction(messageID, userID uint, emoji string) error {
	var existing models.MessageReaction
	err := r.db.Where("message_id = ? AND user_id = ? AND emoji = ?", messageID, userID, emoji).First(&existing).Error
	if err == nil {
		return nil // already reacted
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return r.db.Create(&models.MessageReaction{
		MessageID: messageID,
		UserID:    userID,
		Emoji:     emoji,
	}).Error
}

// RemoveReaction removes an emoji reaction.
func (r *MessageRepository) RemoveReaction(messageID, userID uint, emoji string) error {
	return r.db.Where("message_id = ? AND user_id = ? AND emoji = ?", messageID, userID, emoji).
		Delete(&models.MessageReaction{}).Error
}

// ReactionSummary holds aggregated reaction counts for a message.
type ReactionSummary struct {
	Emoji string `json:"emoji"`
	Count int64  `json:"count"`
}

// GetReactions returns aggregated reaction counts for a message.
func (r *MessageRepository) GetReactions(messageID uint) ([]ReactionSummary, error) {
	var result []ReactionSummary
	err := r.db.Model(&models.MessageReaction{}).
		Select("emoji, COUNT(*) as count").
		Where("message_id = ?", messageID).
		Group("emoji").
		Order("count DESC").
		Scan(&result).Error
	return result, err
}

// GetLastMessage returns the most recent non-deleted message in a room.
func (r *MessageRepository) GetLastMessage(roomID uint) (*models.Message, error) {
	var m models.Message
	err := r.db.Where("room_id = ? AND is_deleted = false", roomID).
		Order("id DESC").Limit(1).First(&m).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &m, nil
}

// UpdateLastRead upserts the user's last-read message position (delegates to room_reads table).
func (r *MessageRepository) UpdateLastRead(roomID, userID, msgID uint) error {
	return r.db.Save(&models.RoomRead{
		RoomID:        roomID,
		UserID:        userID,
		LastReadMsgID: msgID,
		UpdatedAt:     time.Now().UTC(),
	}).Error
}

// ListFiles returns messages that contain file attachments (body starts with {"_type":"file"}).
func (r *MessageRepository) ListFiles(roomID uint, limit, offset int) ([]models.Message, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	var msgs []models.Message
	err := r.db.Where("room_id = ? AND is_deleted = false AND body LIKE ?", roomID, `{"_type":"file"%`).
		Order("id DESC").Limit(limit).Offset(offset).Find(&msgs).Error
	if err != nil {
		return nil, err
	}
	return msgs, nil
}

// CountUnread returns the number of messages the user hasn't read in a room.
func (r *MessageRepository) CountUnread(roomID, userID, lastReadMsgID uint) (int64, error) {
	var n int64
	q := r.db.Model(&models.Message{}).Where("room_id = ? AND is_deleted = false AND sender_id != ?", roomID, userID)
	if lastReadMsgID > 0 {
		q = q.Where("id > ?", lastReadMsgID)
	}
	err := q.Count(&n).Error
	return n, err
}
