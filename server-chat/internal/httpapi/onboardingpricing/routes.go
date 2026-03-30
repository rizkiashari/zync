package onboardingpricing

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/repository"
)

// RegisterPublic registers endpoints without system auth.
func RegisterPublic(api *gin.RouterGroup, repo *repository.OnboardingPricingRepository) {
	api.GET("/onboarding-pricing", list(repo))
}

// RegisterAdmin registers endpoints intended for system administrators.
func RegisterAdmin(api *gin.RouterGroup, repo *repository.OnboardingPricingRepository) {
	api.PUT("/onboarding-pricing", upsert(repo))
}

