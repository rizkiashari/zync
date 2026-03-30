package models

import "time"

// OnboardingPricingPlan is a system-level pricing configuration shown on guest onboarding.
// It can be edited only by system administrators (superadmin).
type OnboardingPricingPlan struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Key         string    `gorm:"uniqueIndex;size:64;not null" json:"key"`
	SortIndex   int       `gorm:"not null;default:0" json:"sort_index"`
	Title       string    `gorm:"size:64;not null" json:"title"`
	PriceIDR    int       `gorm:"not null;default:0" json:"price_idr"`
	Interval    string    `gorm:"size:16;not null;default:'bulan'" json:"interval"`
	Currency    string    `gorm:"size:8;not null;default:'IDR'" json:"currency"`
	Description string    `gorm:"size:256;default:''" json:"description"`
	// Features are stored as JSON string to keep schema simple.
	FeaturesJSON string `gorm:"type:text;default:'[]'" json:"-"`
}

