package models

import "time"

// RecentTask is a per-user ordered list of tasks recently opened inside a workspace.
// It is used to power Dashboard's "Task Terakhir Dibuka".
type RecentTask struct {
	ID uint `gorm:"primaryKey" json:"id"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	UserID      uint      `gorm:"index;not null" json:"user_id"`
	WorkspaceID uint      `gorm:"index;not null" json:"workspace_id"`
	TaskID      uint      `gorm:"index;not null" json:"task_id"`

	LastOpenedAt time.Time `gorm:"index;not null" json:"last_opened_at"`
	SortIndex    int       `gorm:"index;not null;default:0" json:"sort_index"`
}

