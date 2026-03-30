package models

import "time"

type MessageReaction struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	MessageID uint      `gorm:"index;not null" json:"message_id"`
	UserID    uint      `gorm:"not null" json:"user_id"`
	Emoji     string    `gorm:"size:32;not null" json:"emoji"`
}
