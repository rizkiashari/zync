package models

import "time"

const (
	WorkspaceRoleOwner  = "owner"
	WorkspaceRoleAdmin  = "admin"
	WorkspaceRoleMember = "member"
)

// Workspace is a tenant — each client / organisation owns one.
type Workspace struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Slug        string    `gorm:"uniqueIndex;size:64;not null" json:"slug"`
	Name        string    `gorm:"size:128;not null" json:"name"`
	OwnerID     uint      `gorm:"not null" json:"owner_id"`
	InviteToken string    `gorm:"uniqueIndex;size:64" json:"invite_token,omitempty"`

	// White-label branding
	CustomName   string `gorm:"size:128" json:"custom_name"`
	PrimaryColor string `gorm:"size:16;default:'#6366f1'" json:"primary_color"`
	LogoURL      string `gorm:"size:512" json:"logo_url"`
	Description  string `gorm:"size:256" json:"description"`
}

// WorkspaceMember links a User to a Workspace with a role.
type WorkspaceMember struct {
	WorkspaceID uint      `gorm:"primaryKey" json:"workspace_id"`
	UserID      uint      `gorm:"primaryKey" json:"user_id"`
	Role        string    `gorm:"size:16;default:'member'" json:"role"`
	JoinedAt    time.Time `json:"joined_at"`
}
