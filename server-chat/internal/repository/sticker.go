package repository

import (
	"errors"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"zync-server/internal/models"
)

var ErrStickerPackAlreadyOwned = errors.New("sticker pack already owned")

type StickerRepository struct {
	db *gorm.DB
}

func NewStickerRepository(db *gorm.DB) *StickerRepository {
	return &StickerRepository{db: db}
}

// ListCatalog returns all sticker packs ordered by price ascending (free first).
func (r *StickerRepository) ListCatalog() ([]models.StickerPack, error) {
	var rows []models.StickerPack
	err := r.db.Order("is_free DESC, price_coins ASC").Find(&rows).Error
	if rows == nil {
		rows = []models.StickerPack{}
	}
	return rows, err
}

// GetByID fetches a single pack.
func (r *StickerRepository) GetByID(id uint) (*models.StickerPack, error) {
	var p models.StickerPack
	err := r.db.First(&p, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &p, err
}

// GetOwned returns all packs the user has purchased.
func (r *StickerRepository) GetOwned(userID uint) ([]models.StickerPack, error) {
	var rows []models.StickerPack
	err := r.db.
		Joins("JOIN user_sticker_packs ON user_sticker_packs.pack_id = sticker_packs.id").
		Where("user_sticker_packs.user_id = ?", userID).
		Find(&rows).Error
	if rows == nil {
		rows = []models.StickerPack{}
	}
	return rows, err
}

// IsOwned checks whether a user already owns a specific pack.
func (r *StickerRepository) IsOwned(userID, packID uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.UserStickerPack{}).
		Where("user_id = ? AND pack_id = ?", userID, packID).
		Count(&count).Error
	return count > 0, err
}

// Purchase grants a user a sticker pack and deducts coins atomically.
// Pass coins = nil only when price_coins == 0.
func (r *StickerRepository) Purchase(userID, packID uint, coins *CoinRepository) error {
	pack, err := r.GetByID(packID)
	if err != nil {
		return err
	}
	if pack == nil {
		return fmt.Errorf("sticker pack not found")
	}

	already, err := r.IsOwned(userID, packID)
	if err != nil {
		return err
	}
	if already {
		return ErrStickerPackAlreadyOwned
	}

	return r.db.Transaction(func(tx *gorm.DB) error {
		// Deduct coins if pack is paid
		if pack.PriceCoins > 0 && coins != nil {
			var w models.CoinWallet
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where(models.CoinWallet{UserID: userID}).
				FirstOrCreate(&w).Error; err != nil {
				return err
			}
			if w.Balance < pack.PriceCoins {
				return ErrInsufficientCoins
			}
			w.Balance -= pack.PriceCoins
			if err := tx.Save(&w).Error; err != nil {
				return err
			}
			if err := tx.Create(&models.CoinTransaction{
				UserID:       userID,
				Type:         models.CoinTxnStickerBuy,
				Amount:       -pack.PriceCoins,
				BalanceAfter: w.Balance,
				ReferenceID:  fmt.Sprintf("pack_%d", packID),
				Note:         "Beli stiker: " + pack.Name,
			}).Error; err != nil {
				return err
			}
		}

		// Grant ownership
		return tx.Create(&models.UserStickerPack{
			UserID: userID,
			PackID: packID,
		}).Error
	})
}
