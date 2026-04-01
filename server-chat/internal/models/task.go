package models

import "time"

const (
	TaskPriorityLow    = "low"
	TaskPriorityMedium = "medium"
	TaskPriorityHigh   = "high"
)

// TaskBoard holds the kanban board for a group room. One board per room.
type TaskBoard struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	RoomID    uint      `gorm:"uniqueIndex;not null" json:"room_id"`
}

// TaskColumn is a status column in a board (e.g. Todo, In Progress, Done).
type TaskColumn struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	BoardID   uint      `gorm:"not null;index" json:"board_id"`
	Name      string    `gorm:"size:64;not null" json:"name"`
	Color     string    `gorm:"size:32;default:'#6366f1'" json:"color"`
	Position  int       `gorm:"default:0" json:"position"`
}

// Task is a single task card inside a column.
type Task struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	BoardID     uint       `gorm:"not null;index" json:"board_id"`
	ColumnID    uint       `gorm:"not null;index" json:"column_id"`
	CreatedBy   uint       `gorm:"not null" json:"created_by"`
	Title       string     `gorm:"size:256;not null" json:"title"`
	Description string     `gorm:"type:text" json:"description"`
	DeadlineAt       *time.Time `json:"deadline_at"`
	Priority         string     `gorm:"size:16;default:'medium'" json:"priority"`
	Position         int        `gorm:"default:0" json:"position"`
	ReminderSentAt   *time.Time `json:"reminder_sent_at"`
}

// TaskAssignee is the many-to-many join between tasks and users.
type TaskAssignee struct {
	TaskID     uint      `gorm:"primaryKey" json:"task_id"`
	UserID     uint      `gorm:"primaryKey" json:"user_id"`
	AssignedAt time.Time `json:"assigned_at"`
}
