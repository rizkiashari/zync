package repository

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"gorm.io/gorm"

	"zync-server/internal/models"
)

type RefreshTokenRepository struct {
	db  *gorm.DB
	ttl time.Duration
}

func NewRefreshTokenRepository(db *gorm.DB, ttl time.Duration) *RefreshTokenRepository {
	if ttl <= 0 {
		ttl = 30 * 24 * time.Hour // 30 days default
	}
	return &RefreshTokenRepository{db: db, ttl: ttl}
}

func generateRefreshToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// Create generates and persists a new refresh token for userID.
func (r *RefreshTokenRepository) Create(userID uint) (*models.RefreshToken, error) {
	rt := models.RefreshToken{
		UserID:    userID,
		Token:     generateRefreshToken(),
		ExpiresAt: time.Now().UTC().Add(r.ttl),
	}
	if err := r.db.Create(&rt).Error; err != nil {
		return nil, err
	}
	return &rt, nil
}

// GetByToken returns a valid (non-revoked, non-expired) refresh token record.
func (r *RefreshTokenRepository) GetByToken(token string) (*models.RefreshToken, error) {
	var rt models.RefreshToken
	err := r.db.Where("token = ? AND revoked_at IS NULL AND expires_at > ?", token, time.Now().UTC()).First(&rt).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &rt, nil
}

// Revoke invalidates a specific refresh token.
func (r *RefreshTokenRepository) Revoke(token string) error {
	now := time.Now().UTC()
	return r.db.Model(&models.RefreshToken{}).Where("token = ?", token).
		Update("revoked_at", now).Error
}

// RevokeAllForUser invalidates all refresh tokens for a user (logout everywhere).
func (r *RefreshTokenRepository) RevokeAllForUser(userID uint) error {
	now := time.Now().UTC()
	return r.db.Model(&models.RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Update("revoked_at", now).Error
}
