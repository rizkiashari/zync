package models

import "time"

// RoomRead tracks the last message each user has read per room (for unread counts).
type RoomRead struct {
	RoomID        uint      `gorm:"primaryKey" json:"room_id"`
	UserID        uint      `gorm:"primaryKey" json:"user_id"`
	LastReadMsgID uint      `json:"last_read_msg_id"`
	UpdatedAt     time.Time `json:"updated_at"`
}
