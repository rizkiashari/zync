package models

import "time"

type Poll struct {
	ID          uint       `gorm:"primaryKey"          json:"id"`
	RoomID      uint       `gorm:"not null;index"      json:"room_id"`
	CreatedByID uint       `gorm:"not null"            json:"created_by_id"`
	Question    string     `gorm:"type:text;not null"  json:"question"`
	IsMultiple  bool       `gorm:"default:false"       json:"is_multiple"`
	ExpiresAt   *time.Time `                           json:"expires_at"`
	CreatedAt   time.Time  `                           json:"created_at"`
	UpdatedAt   time.Time  `                           json:"updated_at"`
	Options     []PollOption `gorm:"foreignKey:PollID" json:"options"`
}

type PollOption struct {
	ID        uint   `gorm:"primaryKey"         json:"id"`
	PollID    uint   `gorm:"not null;index"     json:"poll_id"`
	Text      string `gorm:"size:256;not null"  json:"text"`
	VoteCount int    `gorm:"default:0"          json:"vote_count"`
}

// PollVote enforces one vote per user per option.
type PollVote struct {
	ID       uint      `gorm:"primaryKey"                              json:"id"`
	PollID   uint      `gorm:"uniqueIndex:idx_poll_vote;not null;index" json:"poll_id"`
	UserID   uint      `gorm:"uniqueIndex:idx_poll_vote;not null"       json:"user_id"`
	OptionID uint      `gorm:"uniqueIndex:idx_poll_vote;not null"       json:"option_id"`
	CreatedAt time.Time `                                                json:"created_at"`
}
