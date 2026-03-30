package onboardingpricing

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/response"
	"zync-server/internal/repository"
)

type upsertBody struct {
	Plans []repository.PricingPlanInput `json:"plans" binding:"required,min=1"`
}

func list(repo *repository.OnboardingPricingRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		plans, err := repo.List()
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, plans)
	}
}

func upsert(repo *repository.OnboardingPricingRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var body upsertBody
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid request body")
			return
		}

		if err := repo.Upsert(body.Plans); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, err.Error())
			return
		}

		plans, err := repo.List()
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, plans)
	}
}

