package models

import "time"

const (
	RoomTypeGroup  = "group"
	RoomTypeDirect = "direct"

	RoleAdmin  = "admin"
	RoleMember = "member"
)

type Room struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	WorkspaceID     uint      `gorm:"index;default:0" json:"workspace_id"`
	Type            string    `gorm:"size:16;not null;index" json:"type"`
	Name            string    `gorm:"size:128" json:"name"`
	Description     string    `gorm:"size:256" json:"description"`
	CreatorID       uint      `json:"creator_id"`
	PinnedMessageID *uint     `json:"pinned_message_id"`
	InviteToken     string    `gorm:"uniqueIndex;size:64" json:"invite_token,omitempty"`
}

type RoomMember struct {
	RoomID   uint      `gorm:"primaryKey" json:"room_id"`
	UserID   uint      `gorm:"primaryKey" json:"user_id"`
	JoinedAt time.Time `json:"joined_at"`
	Role     string    `gorm:"size:16;default:'member'" json:"role"`
}
