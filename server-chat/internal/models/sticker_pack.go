package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// StringSlice is a JSON-serialized []string stored in a text column.
type StringSlice []string

func (s StringSlice) Value() (driver.Value, error) {
	b, err := json.Marshal(s)
	return string(b), err
}
func (s *StringSlice) Scan(src any) error {
	var raw []byte
	switch v := src.(type) {
	case string:
		raw = []byte(v)
	case []byte:
		raw = v
	default:
		return fmt.Errorf("cannot scan %T into StringSlice", src)
	}
	return json.Unmarshal(raw, s)
}

// StickerPack is a named collection of emoji stickers.
type StickerPack struct {
	ID         uint        `gorm:"primaryKey"              json:"id"`
	Slug       string      `gorm:"uniqueIndex;size:64"     json:"slug"`
	Name       string      `gorm:"size:128;not null"       json:"name"`
	PriceCoins int64       `gorm:"not null;default:0"      json:"price_coins"`
	IsFree     bool        `gorm:"not null;default:false"  json:"is_free"`
	Stickers   StringSlice `gorm:"type:text"               json:"stickers"`
	CreatedAt  time.Time   `json:"created_at"`
	UpdatedAt  time.Time   `json:"updated_at"`
}

// UserStickerPack records which premium packs a user has purchased.
type UserStickerPack struct {
	ID        uint      `gorm:"primaryKey"                                    json:"id"`
	UserID    uint      `gorm:"uniqueIndex:idx_user_pack;not null;index"      json:"user_id"`
	PackID    uint      `gorm:"uniqueIndex:idx_user_pack;not null"            json:"pack_id"`
	CreatedAt time.Time `json:"created_at"`
}
