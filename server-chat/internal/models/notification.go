package models

import "time"

const (
	NotificationTypeMention = "mention"
	NotificationTypeSystem  = "system"
)

// Notification stores in-app notifications (e.g. @mentions).
type Notification struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time  `json:"created_at"`
	UserID    uint       `gorm:"index;not null" json:"user_id"`
	Type      string     `gorm:"size:32;not null" json:"type"`
	RoomID    uint       `json:"room_id"`
	MessageID uint       `json:"message_id"`
	FromID    uint       `json:"from_id"`
	Body      string     `gorm:"size:256" json:"body"`
	ReadAt    *time.Time `json:"read_at"`
}
