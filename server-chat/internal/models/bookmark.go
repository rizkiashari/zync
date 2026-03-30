package models

import "time"

type MessageBookmark struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `gorm:"not null;index:idx_bookmark_user_msg,unique" json:"user_id"`
	MessageID uint      `gorm:"not null;index:idx_bookmark_user_msg,unique" json:"message_id"`
	RoomID    uint      `gorm:"not null" json:"room_id"`
}
