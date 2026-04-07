package models

import "time"

// CoinWallet holds the current coin balance per user.
type CoinWallet struct {
	ID        uint      `gorm:"primaryKey"          json:"id"`
	UserID    uint      `gorm:"uniqueIndex;not null" json:"user_id"`
	Balance   int64     `gorm:"not null;default:0"  json:"balance"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CoinTransactionType enumerates all ledger entry kinds.
type CoinTransactionType string

const (
	CoinTxnTopup         CoinTransactionType = "topup"
	CoinTxnSawerSent     CoinTransactionType = "sawer_sent"
	CoinTxnSawerReceived CoinTransactionType = "sawer_received"
	CoinTxnWithdraw      CoinTransactionType = "withdraw"
	CoinTxnStickerBuy    CoinTransactionType = "sticker_buy"
)

// CoinTransaction is an immutable ledger entry for every balance change.
type CoinTransaction struct {
	ID           uint                `gorm:"primaryKey"               json:"id"`
	UserID       uint                `gorm:"not null;index"           json:"user_id"`
	Type         CoinTransactionType `gorm:"type:varchar(32);not null" json:"type"`
	Amount       int64               `gorm:"not null"                 json:"amount"`
	BalanceAfter int64               `gorm:"not null"                 json:"balance_after"`
	ReferenceID  string              `gorm:"size:128"                 json:"reference_id,omitempty"`
	Note         string              `gorm:"size:256"                 json:"note,omitempty"`
	CreatedAt    time.Time           `json:"created_at"`
}
