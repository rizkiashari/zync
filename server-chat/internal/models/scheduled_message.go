package models

import "time"

// ScheduledMessageStatus tracks delivery state.
type ScheduledMessageStatus string

const (
	ScheduledMsgPending   ScheduledMessageStatus = "pending"
	ScheduledMsgSent      ScheduledMessageStatus = "sent"
	ScheduledMsgCancelled ScheduledMessageStatus = "cancelled"
	ScheduledMsgFailed    ScheduledMessageStatus = "failed"
)

// ScheduledMessage holds a message queued for future delivery.
type ScheduledMessage struct {
	ID          uint                   `gorm:"primaryKey"               json:"id"`
	RoomID      uint                   `gorm:"not null;index"           json:"room_id"`
	SenderID    uint                   `gorm:"not null;index"           json:"sender_id"`
	Content     string                 `gorm:"type:text;not null"       json:"content"`
	ReplyToID   *uint                  `                                json:"reply_to_id,omitempty"`
	ScheduledAt time.Time              `gorm:"not null;index"           json:"scheduled_at"`
	Status      ScheduledMessageStatus `gorm:"type:varchar(16);not null;default:'pending';index" json:"status"`
	SentMsgID   *uint                  `                                json:"sent_msg_id,omitempty"`
	CreatedAt   time.Time              `                                json:"created_at"`
	UpdatedAt   time.Time              `                                json:"updated_at"`
}
