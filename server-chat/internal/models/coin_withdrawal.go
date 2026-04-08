package models

import "time"

// WithdrawalStatus tracks processing state.
type WithdrawalStatus string

const (
	WithdrawalPending   WithdrawalStatus = "pending"
	WithdrawalApproved  WithdrawalStatus = "approved"
	WithdrawalRejected  WithdrawalStatus = "rejected"
	WithdrawalCompleted WithdrawalStatus = "completed"
)

// CoinWithdrawal is a user request to cash out coins.
type CoinWithdrawal struct {
	ID          uint             `gorm:"primaryKey"                       json:"id"`
	UserID      uint             `gorm:"not null;index"                   json:"user_id"`
	Coins       int64            `gorm:"not null"                         json:"coins"`
	AmountIDR   int64            `gorm:"not null"                         json:"amount_idr"`
	BankName    string           `gorm:"size:64;not null"                 json:"bank_name"`
	BankAccount string           `gorm:"size:32;not null"                 json:"bank_account"`
	AccountName string           `gorm:"size:128;not null"                json:"account_name"`
	Status      WithdrawalStatus `gorm:"type:varchar(16);not null;default:'pending';index" json:"status"`
	AdminNote   string           `gorm:"size:512"                         json:"admin_note,omitempty"`
	ReviewedBy  *uint            `                                        json:"reviewed_by,omitempty"`
	ReviewedAt  *time.Time       `                                        json:"reviewed_at,omitempty"`
	CreatedAt   time.Time        `                                        json:"created_at"`
	UpdatedAt   time.Time        `                                        json:"updated_at"`
}
