package database

import (
	"log/slog"

	"gorm.io/gorm"

	"zync-server/internal/repository"
)

// SeedOnboardingPricing ensures there's at least a default set of pricing plans.
func SeedOnboardingPricing(db *gorm.DB, log *slog.Logger) error {
	repo := repository.NewOnboardingPricingRepository(db)

	existing, err := repo.List()
	if err != nil {
		return err
	}
	if len(existing) > 0 {
		return nil
	}

	// Default pricing shown on the guest onboarding (advertisement).
	defaultPlans := []repository.PricingPlanInput{
		{
			Key:         "free",
			SortIndex:   0,
			Title:       "Free",
			PriceIDR:    0,
			Currency:    "IDR",
			Interval:    "bulan",
			Description: "Coba dulu dasar fitur chat & workspace.",
			Features: []string{
				"Chat real-time (basic)",
				"Task hub terbatas",
				"Tenant isolation",
				"Support komunitas",
			},
		},
		{
			Key:         "pro",
			SortIndex:   1,
			Title:       "Pro",
			PriceIDR:    199000,
			Currency:    "IDR",
			Interval:    "bulan",
			Description: "Untuk tim yang butuh workflow task yang rapi.",
			Features: []string{
				"Task hub lengkap + recently opened",
				"Kolaborasi grup lebih nyaman",
				"Prioritas performa",
				"Support email 1x24 jam",
			},
		},
		{
			Key:         "enterprise",
			SortIndex:   2,
			Title:       "Enterprise",
			PriceIDR:    499000,
			Currency:    "IDR",
			Interval:    "bulan",
			Description: "Kontrol ekstra untuk organisasi besar.",
			Features: []string{
				"Manajemen workspace lebih fleksibel",
				"Kolaborasi lintas departemen",
				"Keamanan lanjutan",
				"Support prioritas",
			},
		},
	}

	if err := repo.Upsert(defaultPlans); err != nil {
		return err
	}
	log.Info("seeded onboarding pricing plans")
	return nil
}

