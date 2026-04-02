package repository

import (
	"errors"

	"gorm.io/gorm"

	"zync-server/internal/models"
)

type PushSubscriptionRepository struct {
	db *gorm.DB
}

func NewPushSubscriptionRepository(db *gorm.DB) *PushSubscriptionRepository {
	return &PushSubscriptionRepository{db: db}
}

// Upsert creates or updates a push subscription for a user+endpoint pair.
func (r *PushSubscriptionRepository) Upsert(userID uint, endpoint, p256dh, auth string) error {
	var existing models.PushSubscription
	err := r.db.Where("endpoint = ?", endpoint).First(&existing).Error
	if err == nil {
		// Update keys (they may rotate)
		return r.db.Model(&existing).Updates(map[string]any{
			"user_id": userID,
			"p256dh":  p256dh,
			"auth":    auth,
		}).Error
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return r.db.Create(&models.PushSubscription{
		UserID:   userID,
		Endpoint: endpoint,
		P256DH:   p256dh,
		Auth:     auth,
	}).Error
}

// Delete removes a subscription by endpoint.
func (r *PushSubscriptionRepository) Delete(userID uint, endpoint string) error {
	return r.db.Where("user_id = ? AND endpoint = ?", userID, endpoint).
		Delete(&models.PushSubscription{}).Error
}

// ListByUser returns all subscriptions for a user.
func (r *PushSubscriptionRepository) ListByUser(userID uint) ([]models.PushSubscription, error) {
	var subs []models.PushSubscription
	err := r.db.Where("user_id = ?", userID).Find(&subs).Error
	return subs, err
}

// DeleteByEndpoint removes a subscription regardless of user (used on push error).
func (r *PushSubscriptionRepository) DeleteByEndpoint(endpoint string) error {
	return r.db.Where("endpoint = ?", endpoint).Delete(&models.PushSubscription{}).Error
}
