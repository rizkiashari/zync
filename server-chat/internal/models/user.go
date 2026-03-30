package models

import "time"

type User struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	Email        string     `gorm:"uniqueIndex;size:255;not null" json:"email"`
	PasswordHash string     `gorm:"size:255;not null" json:"-"`
	Username     string     `gorm:"size:64" json:"username"`
	Avatar       string     `gorm:"size:512" json:"avatar"`
	Bio          string     `gorm:"size:256" json:"bio"`
	IsOnline     bool       `gorm:"default:false" json:"is_online"`
	LastSeenAt   *time.Time `json:"last_seen_at"`
}
