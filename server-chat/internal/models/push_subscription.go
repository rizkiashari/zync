package models

import "time"

// PushSubscription stores a Web Push endpoint subscription for a user.
type PushSubscription struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `gorm:"index;not null" json:"user_id"`
	Endpoint  string    `gorm:"type:text;not null;uniqueIndex" json:"endpoint"`
	P256DH    string    `gorm:"type:text;not null" json:"p256dh"`
	Auth      string    `gorm:"size:128;not null" json:"auth"`
}
