package repository

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"zync-server/internal/models"
)

var ErrPaymentTxnNotPending = errors.New("payment transaction is not pending")

type PaymentTransactionRepository struct {
	db *gorm.DB
}

func NewPaymentTransactionRepository(db *gorm.DB) *PaymentTransactionRepository {
	return &PaymentTransactionRepository{db: db}
}

// MapPlanKeyToSubscription maps onboarding plan key to workspace subscription fields.
func MapPlanKeyToSubscription(planKey string) (plan string, memberLimit int) {
	k := strings.ToLower(strings.TrimSpace(planKey))
	switch k {
	case models.PlanFree:
		return models.PlanFree, 5
	case models.PlanPro:
		return models.PlanPro, -1
	case models.PlanEnterprise:
		return models.PlanEnterprise, -1
	default:
		// Unknown keys from custom pricing → treat as paid tier
		return models.PlanPro, -1
	}
}

func (r *PaymentTransactionRepository) Create(row *models.PaymentTransaction) error {
	return r.db.Create(row).Error
}

func (r *PaymentTransactionRepository) GetByOrderID(orderID string) (*models.PaymentTransaction, error) {
	var row models.PaymentTransaction
	err := r.db.Where("order_id = ?", orderID).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *PaymentTransactionRepository) GetByID(id uint) (*models.PaymentTransaction, error) {
	var row models.PaymentTransaction
	err := r.db.First(&row, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

// ListByWorkspace returns recent transactions for a tenant (newest first).
func (r *PaymentTransactionRepository) ListByWorkspace(workspaceID uint, limit int) ([]models.PaymentTransaction, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	var rows []models.PaymentTransaction
	err := r.db.Where("workspace_id = ?", workspaceID).
		Order("created_at DESC").
		Limit(limit).
		Find(&rows).Error
	if rows == nil {
		rows = make([]models.PaymentTransaction, 0)
	}
	return rows, err
}

// PaymentTransactionAdminRow is a transaction plus workspace slug and requester email for admin UI.
type PaymentTransactionAdminRow struct {
	models.PaymentTransaction
	WorkspaceSlug  string `json:"workspace_slug"`
	RequesterEmail string `json:"requester_email"`
}

// ListForAdmin returns transactions across workspaces, optional status filter (empty = all).
func (r *PaymentTransactionRepository) ListForAdmin(status string, limit, offset int) ([]PaymentTransactionAdminRow, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	q := r.db.Table("payment_transactions").
		Select("payment_transactions.*, workspaces.slug AS workspace_slug, users.email AS requester_email").
		Joins("JOIN workspaces ON workspaces.id = payment_transactions.workspace_id").
		Joins("JOIN users ON users.id = payment_transactions.user_id").
		Order("payment_transactions.created_at DESC").
		Limit(limit).
		Offset(offset)
	if strings.TrimSpace(status) != "" {
		q = q.Where("payment_transactions.status = ?", strings.TrimSpace(status))
	}
	var rows []PaymentTransactionAdminRow
	if err := q.Scan(&rows).Error; err != nil {
		return nil, err
	}
	if rows == nil {
		rows = make([]PaymentTransactionAdminRow, 0)
	}
	return rows, nil
}

func (r *PaymentTransactionRepository) approveAndApplySubscription(txn *models.PaymentTransaction, reviewedBy *uint, midtransMeta map[string]string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var cur models.PaymentTransaction
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&cur, txn.ID).Error; err != nil {
			return err
		}
		if cur.Status != models.PayTxnPending {
			return ErrPaymentTxnNotPending
		}
		plan, memberLimit := MapPlanKeyToSubscription(cur.PlanKey)
		res := tx.Model(&models.WorkspaceSubscription{}).
			Where("workspace_id = ?", cur.WorkspaceID).
			Updates(map[string]any{
				"plan":         plan,
				"status":       models.SubStatusActive,
				"member_limit": memberLimit,
			})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			sub := models.WorkspaceSubscription{
				WorkspaceID: cur.WorkspaceID,
				Plan:        plan,
				Status:      models.SubStatusActive,
				MemberLimit: memberLimit,
			}
			if err := tx.Create(&sub).Error; err != nil {
				return err
			}
		}
		now := time.Now().UTC()
		updates := map[string]any{
			"status":     models.PayTxnApproved,
			"reviewed_at": now,
		}
		if reviewedBy != nil {
			updates["reviewed_by"] = *reviewedBy
		}
		if midtransMeta != nil {
			if v := midtransMeta["transaction_status"]; v != "" {
				updates["midtrans_transaction_status"] = v
			}
			if v := midtransMeta["payment_type"]; v != "" {
				updates["midtrans_payment_type"] = v
			}
			if v := midtransMeta["transaction_id"]; v != "" {
				updates["midtrans_transaction_id"] = v
			}
		}
		return tx.Model(&cur).Updates(updates).Error
	})
}

// ApproveByAdmin marks approved and applies subscription plan to workspace.
func (r *PaymentTransactionRepository) ApproveByAdmin(txnID uint, adminUserID uint) error {
	txn, err := r.GetByID(txnID)
	if err != nil {
		return err
	}
	if txn == nil {
		return fmt.Errorf("transaction not found")
	}
	rb := adminUserID
	return r.approveAndApplySubscription(txn, &rb, nil)
}

// ApplyMidtransSuccess verifies pending row and applies subscription (idempotent if already approved).
func (r *PaymentTransactionRepository) ApplyMidtransSuccess(orderID string, meta map[string]string) error {
	txn, err := r.GetByOrderID(orderID)
	if err != nil || txn == nil {
		return fmt.Errorf("unknown order_id")
	}
	if txn.Status == models.PayTxnApproved {
		return nil
	}
	if txn.Status != models.PayTxnPending {
		return fmt.Errorf("transaction not pending")
	}
	return r.approveAndApplySubscription(txn, nil, meta)
}

// RejectByAdmin marks transaction rejected (does not change subscription).
func (r *PaymentTransactionRepository) RejectByAdmin(txnID uint, adminUserID uint, note string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var cur models.PaymentTransaction
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&cur, txnID).Error; err != nil {
			return err
		}
		if cur.Status != models.PayTxnPending {
			return ErrPaymentTxnNotPending
		}
		now := time.Now().UTC()
		return tx.Model(&cur).Updates(map[string]any{
			"status":      models.PayTxnRejected,
			"reviewed_by": adminUserID,
			"reviewed_at": now,
			"admin_note":  strings.TrimSpace(note),
		}).Error
	})
}

// UpdateMidtransMirror stores Midtrans fields while status stays pending.
func (r *PaymentTransactionRepository) UpdateMidtransMirror(orderID, transStatus, paymentType, transID string) error {
	if orderID == "" {
		return nil
	}
	return r.db.Model(&models.PaymentTransaction{}).
		Where("order_id = ?", orderID).
		Updates(map[string]any{
			"midtrans_transaction_status": transStatus,
			"midtrans_payment_type":       paymentType,
			"midtrans_transaction_id":     transID,
		}).Error
}

// MarkMidtransNonSuccess updates mirror fields and terminal status for deny/cancel/expire.
func (r *PaymentTransactionRepository) MarkMidtransNonSuccess(orderID, transStatus, paymentType, transID string) error {
	ts := strings.ToLower(strings.TrimSpace(transStatus))
	var status string
	switch ts {
	case "deny", "failure":
		status = models.PayTxnRejected
	case "cancel":
		status = models.PayTxnCanceled
	case "expire":
		status = models.PayTxnExpired
	default:
		return nil
	}
	return r.db.Model(&models.PaymentTransaction{}).
		Where("order_id = ? AND status = ?", orderID, models.PayTxnPending).
		Updates(map[string]any{
			"status":                        status,
			"midtrans_transaction_status":   transStatus,
			"midtrans_payment_type":         paymentType,
			"midtrans_transaction_id":       transID,
			"admin_note":                    "Midtrans: " + transStatus,
		}).Error
}
