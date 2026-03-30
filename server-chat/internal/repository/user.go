package repository

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"zync-server/internal/models"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(u *models.User) error {
	return r.db.Create(u).Error
}

func (r *UserRepository) GetByEmail(email string) (*models.User, error) {
	var u models.User
	err := r.db.Where("email = ?", email).First(&u).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) GetByID(id uint) (*models.User, error) {
	var u models.User
	err := r.db.First(&u, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

// ListAllForAdmin returns every user (system maintenance), optional search on username/email.
func (r *UserRepository) ListAllForAdmin(search string) ([]models.User, error) {
	q := r.db.Model(&models.User{})
	if s := strings.TrimSpace(search); s != "" {
		like := "%" + s + "%"
		q = q.Where("username ILIKE ? OR email ILIKE ?", like, like)
	}
	var users []models.User
	err := q.Order("id ASC").Find(&users).Error
	return users, err
}

// CountSystemAdmins returns users with IsSystemAdmin set.
func (r *UserRepository) CountSystemAdmins() (int64, error) {
	var n int64
	err := r.db.Model(&models.User{}).Where("is_system_admin = ?", true).Count(&n).Error
	return n, err
}

// List returns all users except excludeID, optionally filtered by search term (username or email).
func (r *UserRepository) List(excludeID uint, search string) ([]models.User, error) {
	q := r.db.Where("id != ?", excludeID)
	if s := strings.TrimSpace(search); s != "" {
		like := "%" + s + "%"
		q = q.Where("username ILIKE ? OR email ILIKE ?", like, like)
	}
	var users []models.User
	err := q.Order("username ASC, email ASC").Find(&users).Error
	return users, err
}

// GetByUsername returns user by exact username (case-insensitive).
func (r *UserRepository) GetByUsername(username string) (*models.User, error) {
	var u models.User
	err := r.db.Where("LOWER(username) = LOWER(?)", username).First(&u).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

// UpdateProfileFields updates only the given columns (e.g. partial profile PUT).
func (r *UserRepository) UpdateProfileFields(id uint, fields map[string]any) error {
	if len(fields) == 0 {
		return nil
	}
	return r.db.Model(&models.User{}).Where("id = ?", id).Updates(fields).Error
}

// UpdatePassword sets a new password hash for the user.
func (r *UserRepository) UpdatePassword(id uint, hash string) error {
	return r.db.Model(&models.User{}).Where("id = ?", id).Update("password_hash", hash).Error
}

// SetOnline updates the is_online status. On going offline, also sets last_seen_at.
func (r *UserRepository) SetOnline(id uint, online bool) error {
	fields := map[string]any{"is_online": online}
	if !online {
		now := time.Now().UTC()
		fields["last_seen_at"] = now
	}
	return r.db.Model(&models.User{}).Where("id = ?", id).Updates(fields).Error
}

// CountOnline returns the number of users currently online.
func (r *UserRepository) CountOnline() (int64, error) {
	var n int64
	err := r.db.Model(&models.User{}).Where("is_online = true").Count(&n).Error
	return n, err
}

// ListOnline returns users currently marked as online.
func (r *UserRepository) ListOnline() ([]models.User, error) {
	var users []models.User
	err := r.db.Where("is_online = true").Order("username ASC").Find(&users).Error
	return users, err
}

// Block records that blockerID has blocked blockedID.
func (r *UserRepository) Block(blockerID, blockedID uint) error {
	var existing models.UserBlock
	err := r.db.Where("blocker_id = ? AND blocked_id = ?", blockerID, blockedID).First(&existing).Error
	if err == nil {
		return nil // already blocked
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return r.db.Create(&models.UserBlock{BlockerID: blockerID, BlockedID: blockedID}).Error
}

// Unblock removes a block relationship.
func (r *UserRepository) Unblock(blockerID, blockedID uint) error {
	return r.db.Where("blocker_id = ? AND blocked_id = ?", blockerID, blockedID).
		Delete(&models.UserBlock{}).Error
}

// IsBlocked returns true if blockerID has blocked blockedID.
func (r *UserRepository) IsBlocked(blockerID, blockedID uint) (bool, error) {
	var n int64
	err := r.db.Model(&models.UserBlock{}).
		Where("blocker_id = ? AND blocked_id = ?", blockerID, blockedID).Count(&n).Error
	return n > 0, err
}

// ListBlocked returns all users that blockerID has blocked.
func (r *UserRepository) ListBlocked(blockerID uint) ([]models.User, error) {
	var users []models.User
	err := r.db.
		Joins("JOIN user_blocks ON user_blocks.blocked_id = users.id").
		Where("user_blocks.blocker_id = ?", blockerID).
		Find(&users).Error
	return users, err
}
