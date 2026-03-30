package models

import "time"

type Message struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	RoomID      uint       `gorm:"index;not null" json:"room_id"`
	SenderID    uint       `gorm:"not null;index" json:"sender_id"`
	Body        string     `gorm:"type:text;not null" json:"body"`
	ReplyToID   *uint      `gorm:"index" json:"reply_to_id"`
	EditedAt    *time.Time `json:"edited_at"`
	IsDeleted   bool       `gorm:"default:false" json:"is_deleted"`
}
