package repository

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"zync-server/internal/models"
)

var ErrWithdrawalNotFound = errors.New("withdrawal not found")
var ErrWithdrawalNotPending = errors.New("withdrawal is not pending")

type CoinWithdrawalRepository struct {
	db *gorm.DB
}

func NewCoinWithdrawalRepository(db *gorm.DB) *CoinWithdrawalRepository {
	return &CoinWithdrawalRepository{db: db}
}

// Submit creates a withdrawal request and deducts coins immediately.
func (r *CoinWithdrawalRepository) Submit(req *models.CoinWithdrawal) error {
	if req.Coins <= 0 {
		return fmt.Errorf("withdrawal coins must be positive")
	}
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Deduct coins via coin repo using same tx
		var w models.CoinWallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where(models.CoinWallet{UserID: req.UserID}).
			FirstOrCreate(&w).Error; err != nil {
			return err
		}
		if w.Balance < req.Coins {
			return ErrInsufficientCoins
		}
		w.Balance -= req.Coins
		if err := tx.Save(&w).Error; err != nil {
			return err
		}
		refID := fmt.Sprintf("withdrawal-%d-%d", req.UserID, time.Now().UnixNano())
		if err := tx.Create(&models.CoinTransaction{
			UserID:       req.UserID,
			Type:         models.CoinTxnWithdraw,
			Amount:       -req.Coins,
			BalanceAfter: w.Balance,
			ReferenceID:  refID,
			Note:         fmt.Sprintf("Withdrawal request to %s %s", req.BankName, req.BankAccount),
		}).Error; err != nil {
			return err
		}
		req.Status = models.WithdrawalPending
		return tx.Create(req).Error
	})
}

// ListByUser returns withdrawals for a user, newest first.
func (r *CoinWithdrawalRepository) ListByUser(userID uint) ([]models.CoinWithdrawal, error) {
	var rows []models.CoinWithdrawal
	err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&rows).Error
	if rows == nil {
		rows = []models.CoinWithdrawal{}
	}
	return rows, err
}

// Approve marks withdrawal approved+completed.
func (r *CoinWithdrawalRepository) Approve(id, adminID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var w models.CoinWithdrawal
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&w, id).Error; err != nil {
			return ErrWithdrawalNotFound
		}
		if w.Status != models.WithdrawalPending {
			return ErrWithdrawalNotPending
		}
		now := time.Now().UTC()
		return tx.Model(&w).Updates(map[string]any{
			"status":      models.WithdrawalCompleted,
			"reviewed_by": adminID,
			"reviewed_at": now,
		}).Error
	})
}

// Reject marks withdrawal rejected and refunds coins.
func (r *CoinWithdrawalRepository) Reject(id, adminID uint, note string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var w models.CoinWithdrawal
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&w, id).Error; err != nil {
			return ErrWithdrawalNotFound
		}
		if w.Status != models.WithdrawalPending {
			return ErrWithdrawalNotPending
		}
		now := time.Now().UTC()
		if err := tx.Model(&w).Updates(map[string]any{
			"status":      models.WithdrawalRejected,
			"reviewed_by": adminID,
			"reviewed_at": now,
			"admin_note":  note,
		}).Error; err != nil {
			return err
		}
		// Refund coins
		var wallet models.CoinWallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where(models.CoinWallet{UserID: w.UserID}).
			FirstOrCreate(&wallet).Error; err != nil {
			return err
		}
		wallet.Balance += w.Coins
		if err := tx.Save(&wallet).Error; err != nil {
			return err
		}
		return tx.Create(&models.CoinTransaction{
			UserID:       w.UserID,
			Type:         models.CoinTxnTopup,
			Amount:       w.Coins,
			BalanceAfter: wallet.Balance,
			ReferenceID:  fmt.Sprintf("refund-withdrawal-%d", id),
			Note:         "Refund: withdrawal rejected",
		}).Error
	})
}