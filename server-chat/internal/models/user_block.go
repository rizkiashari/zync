package models

import "time"

// UserBlock records when a user blocks another user.
type UserBlock struct {
	BlockerID uint      `gorm:"primaryKey" json:"blocker_id"`
	BlockedID uint      `gorm:"primaryKey" json:"blocked_id"`
	CreatedAt time.Time `json:"created_at"`
}
