package models

import "time"

const (
	PayChannelMidtrans = "midtrans"
	PayChannelManual   = "manual"

	PayTxnPending  = "pending"
	PayTxnApproved = "approved"
	PayTxnRejected = "rejected"
	PayTxnExpired  = "expired"
	PayTxnCanceled = "canceled"
)

// PaymentTransaction is a workspace billing request (Midtrans or manual awaiting admin).
type PaymentTransaction struct {
	ID                        uint       `gorm:"primaryKey" json:"id"`
	CreatedAt                 time.Time  `json:"created_at"`
	UpdatedAt                 time.Time  `json:"updated_at"`
	WorkspaceID               uint       `gorm:"index;not null" json:"workspace_id"`
	UserID                    uint       `gorm:"index;not null" json:"user_id"`
	OrderID                   string     `gorm:"uniqueIndex;size:160;not null" json:"order_id"`
	PlanKey                   string     `gorm:"size:64;not null" json:"plan_key"`
	AmountIDR                 int64      `gorm:"not null" json:"amount_idr"`
	Currency                  string     `gorm:"size:8;default:'IDR'" json:"currency"`
	PaymentMethod             string     `gorm:"size:32" json:"payment_method"`
	Channel                   string     `gorm:"size:16;not null;index" json:"channel"` // midtrans | manual
	Status                    string     `gorm:"size:24;not null;index" json:"status"`
	MidtransTransactionStatus string     `gorm:"size:32" json:"midtrans_transaction_status,omitempty"`
	MidtransPaymentType       string     `gorm:"size:32" json:"midtrans_payment_type,omitempty"`
	MidtransTransactionID     string     `gorm:"size:128" json:"midtrans_transaction_id,omitempty"`
	AdminNote                 string     `gorm:"size:512" json:"admin_note,omitempty"`
	ReviewedBy                *uint      `json:"reviewed_by,omitempty"`
	ReviewedAt                *time.Time `json:"reviewed_at,omitempty"`
	// Manual transfer: proof + payer bank details (filled when channel=manual).
	ManualProofImageURL      string `gorm:"size:512" json:"manual_proof_image_url,omitempty"`
	ManualPayerBankName      string `gorm:"size:128" json:"manual_payer_bank_name,omitempty"`
	ManualPayerAccountDigits string `gorm:"size:64" json:"manual_payer_account_digits,omitempty"`
}
