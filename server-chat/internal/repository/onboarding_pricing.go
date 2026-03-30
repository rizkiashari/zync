package repository

import (
	"encoding/json"
	"fmt"

	"gorm.io/gorm"

	"zync-server/internal/models"
)

type PricingPlanInput struct {
	Key         string   `json:"key" binding:"required"`
	SortIndex   int      `json:"sort_index"`
	Title       string   `json:"title" binding:"required"`
	PriceIDR    int      `json:"price_idr"`
	Interval    string   `json:"interval"`
	Currency    string   `json:"currency"`
	Description string   `json:"description"`
	Features    []string `json:"features"`
}

type PricingPlanEntry struct {
	Key         string   `json:"key"`
	SortIndex   int      `json:"sort_index"`
	Title       string   `json:"title"`
	PriceIDR    int      `json:"price_idr"`
	Interval    string   `json:"interval"`
	Currency    string   `json:"currency"`
	Description string   `json:"description"`
	Features    []string `json:"features"`
}

type OnboardingPricingRepository struct {
	db *gorm.DB
}

func NewOnboardingPricingRepository(db *gorm.DB) *OnboardingPricingRepository {
	return &OnboardingPricingRepository{db: db}
}

func (r *OnboardingPricingRepository) List() ([]PricingPlanEntry, error) {
	var rows []models.OnboardingPricingPlan
	if err := r.db.Order("sort_index asc").Find(&rows).Error; err != nil {
		return nil, err
	}

	items := make([]PricingPlanEntry, 0, len(rows))
	for _, p := range rows {
		var feats []string
		if p.FeaturesJSON != "" {
			// Stored as JSON string; if malformed, fall back to empty.
			_ = json.Unmarshal([]byte(p.FeaturesJSON), &feats)
		}
		items = append(items, PricingPlanEntry{
			Key:         p.Key,
			SortIndex:   p.SortIndex,
			Title:       p.Title,
			PriceIDR:    p.PriceIDR,
			Interval:    p.Interval,
			Currency:    p.Currency,
			Description: p.Description,
			Features:    feats,
		})
	}

	return items, nil
}

func (r *OnboardingPricingRepository) Upsert(plans []PricingPlanInput) error {
	if len(plans) == 0 {
		return fmt.Errorf("no plans provided")
	}

	return r.db.Transaction(func(tx *gorm.DB) error {
		for _, in := range plans {
			featsJSON, err := json.Marshal(in.Features)
			if err != nil {
				return fmt.Errorf("marshal features for key=%s: %w", in.Key, err)
			}

			var existing models.OnboardingPricingPlan
			err = tx.Where("key = ?", in.Key).First(&existing).Error
			if err != nil {
				if err == gorm.ErrRecordNotFound {
					row := models.OnboardingPricingPlan{
						Key:           in.Key,
						SortIndex:     in.SortIndex,
						Title:         in.Title,
						PriceIDR:      in.PriceIDR,
						Interval:      in.Interval,
						Currency:      in.Currency,
						Description:   in.Description,
						FeaturesJSON: string(featsJSON),
					}
					if err := tx.Create(&row).Error; err != nil {
						return err
					}
					continue
				}
				return err
			}

			updates := map[string]any{
				"sort_index":     in.SortIndex,
				"title":          in.Title,
				"price_idr":      in.PriceIDR,
				"interval":       in.Interval,
				"currency":       in.Currency,
				"description":    in.Description,
				"features_json":  string(featsJSON),
			}
			if err := tx.Model(&existing).Updates(updates).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

