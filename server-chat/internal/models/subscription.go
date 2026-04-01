package models

import "time"

const (
	PlanFree       = "free"
	PlanPro        = "pro"
	PlanEnterprise = "enterprise"

	SubStatusActive   = "active"
	SubStatusExpired  = "expired"
	SubStatusCanceled = "canceled"
)

// WorkspaceSubscription stores the billing plan for a workspace.
type WorkspaceSubscription struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	WorkspaceID uint       `gorm:"uniqueIndex;not null" json:"workspace_id"`
	Plan        string     `gorm:"size:32;default:'free'" json:"plan"`
	Status      string     `gorm:"size:32;default:'active'" json:"status"`
	ExpiresAt   *time.Time `json:"expires_at"`
	MemberLimit int        `gorm:"default:5" json:"member_limit"`
}
