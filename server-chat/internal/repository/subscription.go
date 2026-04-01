package repository

import (
	"time"

	"gorm.io/gorm"

	"zync-server/internal/models"
)

type SubscriptionRepository struct {
	db *gorm.DB
}

func NewSubscriptionRepository(db *gorm.DB) *SubscriptionRepository {
	return &SubscriptionRepository{db: db}
}

// GetByWorkspace returns the subscription for a workspace, creating a free plan if not found.
func (r *SubscriptionRepository) GetByWorkspace(workspaceID uint) (*models.WorkspaceSubscription, error) {
	var sub models.WorkspaceSubscription
	err := r.db.Where("workspace_id = ?", workspaceID).First(&sub).Error
	if err == gorm.ErrRecordNotFound {
		sub = models.WorkspaceSubscription{
			WorkspaceID: workspaceID,
			Plan:        models.PlanFree,
			Status:      models.SubStatusActive,
			MemberLimit: 5,
		}
		if err2 := r.db.Create(&sub).Error; err2 != nil {
			return nil, err2
		}
		return &sub, nil
	}
	return &sub, err
}

// SetPlan updates plan, status, member_limit, and optional expiry for a workspace.
func (r *SubscriptionRepository) SetPlan(workspaceID uint, plan, status string, memberLimit int, expiresAt *time.Time) (*models.WorkspaceSubscription, error) {
	sub, err := r.GetByWorkspace(workspaceID)
	if err != nil {
		return nil, err
	}
	sub.Plan = plan
	sub.Status = status
	sub.MemberLimit = memberLimit
	sub.ExpiresAt = expiresAt
	if err2 := r.db.Save(sub).Error; err2 != nil {
		return nil, err2
	}
	return sub, nil
}
