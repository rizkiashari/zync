package database

import (
	"log/slog"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"zync-server/internal/models"
)

type stickerPackSeed struct {
	Slug       string
	Name       string
	PriceCoins int64
	IsFree     bool
	Stickers   models.StringSlice
}

var defaultStickerPacks = []stickerPackSeed{
	{
		Slug: "love", Name: "Love Pack", PriceCoins: 30, IsFree: false,
		Stickers: models.StringSlice{"💝", "💖", "💗", "💓", "💞", "💕", "💟", "❣️", "💔", "❤️‍🔥", "🥰", "😘"},
	},
	{
		Slug: "party", Name: "Party Pack", PriceCoins: 50, IsFree: false,
		Stickers: models.StringSlice{"🎯", "🎪", "🎠", "🎡", "🎢", "🎭", "🎬", "🎤", "🎧", "🎼", "🎸", "🥁"},
	},
	{
		Slug: "food", Name: "Food Pack", PriceCoins: 25, IsFree: false,
		Stickers: models.StringSlice{"🍕", "🍔", "🍟", "🍗", "🍣", "🍜", "🌮", "🥙", "🍰", "🧁", "🍩", "☕"},
	},
	{
		Slug: "animals", Name: "Animal Pack", PriceCoins: 20, IsFree: false,
		Stickers: models.StringSlice{"🐶", "🐱", "🐻", "🦊", "🐼", "🐸", "🦁", "🐨", "🐯", "🦋", "🐧", "🦄"},
	},
}

// SeedStickerPacks ensures default packs exist (upsert by slug, never deletes).
func SeedStickerPacks(db *gorm.DB, log *slog.Logger) error {
	for _, s := range defaultStickerPacks {
		pack := models.StickerPack{
			Slug:       s.Slug,
			Name:       s.Name,
			PriceCoins: s.PriceCoins,
			IsFree:     s.IsFree,
			Stickers:   s.Stickers,
		}
		res := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "slug"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "price_coins", "is_free", "stickers"}),
		}).Create(&pack)
		if res.Error != nil {
			log.Error("seed sticker packs", "slug", s.Slug, "error", res.Error)
			return res.Error
		}
	}
	log.Info("sticker packs seeded", "count", len(defaultStickerPacks))
	return nil
}
