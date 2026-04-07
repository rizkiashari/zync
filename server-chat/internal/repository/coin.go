package repository

import (
	"errors"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"zync-server/internal/models"
)

var ErrInsufficientCoins = errors.New("insufficient coin balance")

type CoinRepository struct {
	db *gorm.DB
}

func NewCoinRepository(db *gorm.DB) *CoinRepository {
	return &CoinRepository{db: db}
}

// EnsureWallet returns the wallet for userID, creating it if it doesn't exist.
func (r *CoinRepository) EnsureWallet(userID uint) (*models.CoinWallet, error) {
	var w models.CoinWallet
	err := r.db.
		Where(models.CoinWallet{UserID: userID}).
		FirstOrCreate(&w).Error
	if err != nil {
		return nil, err
	}
	return &w, nil
}

// GetBalance returns the current balance for the user (0 if no wallet yet).
func (r *CoinRepository) GetBalance(userID uint) (int64, error) {
	w, err := r.EnsureWallet(userID)
	if err != nil {
		return 0, err
	}
	return w.Balance, nil
}

// Topup credits coins to a user's wallet and records the ledger entry.
func (r *CoinRepository) Topup(userID uint, amount int64, refID, note string) error {
	if amount <= 0 {
		return fmt.Errorf("topup amount must be positive")
	}
	return r.db.Transaction(func(tx *gorm.DB) error {
		var w models.CoinWallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where(models.CoinWallet{UserID: userID}).
			FirstOrCreate(&w).Error; err != nil {
			return err
		}
		w.Balance += amount
		if err := tx.Save(&w).Error; err != nil {
			return err
		}
		return tx.Create(&models.CoinTransaction{
			UserID:       userID,
			Type:         models.CoinTxnTopup,
			Amount:       amount,
			BalanceAfter: w.Balance,
			ReferenceID:  refID,
			Note:         note,
		}).Error
	})
}

// Sawer deducts coins from sender and credits them to receiver atomically.
func (r *CoinRepository) Sawer(senderID, receiverID uint, amount int64, refID, note string) error {
	if amount <= 0 {
		return fmt.Errorf("sawer amount must be positive")
	}
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Lock sender wallet
		var sender models.CoinWallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where(models.CoinWallet{UserID: senderID}).
			FirstOrCreate(&sender).Error; err != nil {
			return err
		}
		if sender.Balance < amount {
			return ErrInsufficientCoins
		}
		sender.Balance -= amount
		if err := tx.Save(&sender).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.CoinTransaction{
			UserID:       senderID,
			Type:         models.CoinTxnSawerSent,
			Amount:       -amount,
			BalanceAfter: sender.Balance,
			ReferenceID:  refID,
			Note:         note,
		}).Error; err != nil {
			return err
		}

		// Lock receiver wallet
		var receiver models.CoinWallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where(models.CoinWallet{UserID: receiverID}).
			FirstOrCreate(&receiver).Error; err != nil {
			return err
		}
		receiver.Balance += amount
		if err := tx.Save(&receiver).Error; err != nil {
			return err
		}
		return tx.Create(&models.CoinTransaction{
			UserID:       receiverID,
			Type:         models.CoinTxnSawerReceived,
			Amount:       amount,
			BalanceAfter: receiver.Balance,
			ReferenceID:  refID,
			Note:         note,
		}).Error
	})
}

// DeductForPurchase deducts coins from a user for a sticker pack purchase.
func (r *CoinRepository) DeductForPurchase(userID uint, amount int64, refID, note string) error {
	if amount <= 0 {
		return nil // free pack
	}
	return r.db.Transaction(func(tx *gorm.DB) error {
		var w models.CoinWallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where(models.CoinWallet{UserID: userID}).
			FirstOrCreate(&w).Error; err != nil {
			return err
		}
		if w.Balance < amount {
			return ErrInsufficientCoins
		}
		w.Balance -= amount
		if err := tx.Save(&w).Error; err != nil {
			return err
		}
		return tx.Create(&models.CoinTransaction{
			UserID:       userID,
			Type:         models.CoinTxnStickerBuy,
			Amount:       -amount,
			BalanceAfter: w.Balance,
			ReferenceID:  refID,
			Note:         note,
		}).Error
	})
}

// ListTransactions returns up to limit recent transactions for a user.
func (r *CoinRepository) ListTransactions(userID uint, limit int) ([]models.CoinTransaction, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	var rows []models.CoinTransaction
	err := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&rows).Error
	if rows == nil {
		rows = []models.CoinTransaction{}
	}
	return rows, err
}
