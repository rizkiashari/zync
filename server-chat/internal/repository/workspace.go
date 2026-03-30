package repository

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"zync-server/internal/models"
)

type WorkspaceRepository struct {
	db *gorm.DB
}

func NewWorkspaceRepository(db *gorm.DB) *WorkspaceRepository {
	return &WorkspaceRepository{db: db}
}

func genWorkspaceToken() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// Create creates a workspace and adds ownerID as the owner member in a transaction.
func (r *WorkspaceRepository) Create(slug, name string, ownerID uint) (*models.Workspace, error) {
	var ws models.Workspace
	err := r.db.Transaction(func(tx *gorm.DB) error {
		ws = models.Workspace{
			Slug:        slug,
			Name:        name,
			OwnerID:     ownerID,
			InviteToken: genWorkspaceToken(),
		}
		if err := tx.Create(&ws).Error; err != nil {
			return err
		}
		m := models.WorkspaceMember{
			WorkspaceID: ws.ID,
			UserID:      ownerID,
			Role:        models.WorkspaceRoleOwner,
			JoinedAt:    time.Now().UTC(),
		}
		return tx.Create(&m).Error
	})
	if err != nil {
		return nil, err
	}
	return &ws, nil
}

// GetBySlug fetches workspace by slug.
func (r *WorkspaceRepository) GetBySlug(slug string) (*models.Workspace, error) {
	var ws models.Workspace
	err := r.db.Where("slug = ?", slug).First(&ws).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &ws, nil
}

// GetByID fetches workspace by primary key.
func (r *WorkspaceRepository) GetByID(id uint) (*models.Workspace, error) {
	var ws models.Workspace
	err := r.db.First(&ws, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &ws, nil
}

// GetByInviteToken fetches workspace by invite token.
func (r *WorkspaceRepository) GetByInviteToken(token string) (*models.Workspace, error) {
	var ws models.Workspace
	err := r.db.Where("invite_token = ?", token).First(&ws).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &ws, nil
}

// ListForUser returns all workspaces a user belongs to, oldest first.
func (r *WorkspaceRepository) ListForUser(userID uint) ([]models.Workspace, error) {
	var workspaces []models.Workspace
	err := r.db.
		Joins("JOIN workspace_members ON workspace_members.workspace_id = workspaces.id").
		Where("workspace_members.user_id = ?", userID).
		Order("workspaces.created_at ASC").
		Find(&workspaces).Error
	return workspaces, err
}

// IsMember returns true if the user belongs to the workspace.
func (r *WorkspaceRepository) IsMember(workspaceID, userID uint) (bool, error) {
	var n int64
	err := r.db.Model(&models.WorkspaceMember{}).
		Where("workspace_id = ? AND user_id = ?", workspaceID, userID).
		Count(&n).Error
	return n > 0, err
}

// GetMemberRole returns the role of a user in the workspace ("" if not a member).
func (r *WorkspaceRepository) GetMemberRole(workspaceID, userID uint) (string, error) {
	var m models.WorkspaceMember
	err := r.db.Where("workspace_id = ? AND user_id = ?", workspaceID, userID).First(&m).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return "", err
	}
	return m.Role, nil
}

// AddMember adds a user to a workspace with the given role.
func (r *WorkspaceRepository) AddMember(workspaceID, userID uint, role string) error {
	already, err := r.IsMember(workspaceID, userID)
	if err != nil {
		return err
	}
	if already {
		return errors.New("already_member")
	}
	m := models.WorkspaceMember{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Role:        role,
		JoinedAt:    time.Now().UTC(),
	}
	return r.db.Create(&m).Error
}

// RegenerateInviteToken creates a fresh invite token for the workspace.
func (r *WorkspaceRepository) RegenerateInviteToken(workspaceID uint) (string, error) {
	token := genWorkspaceToken()
	err := r.db.Model(&models.Workspace{}).Where("id = ?", workspaceID).Update("invite_token", token).Error
	return token, err
}

// UniqueSlug returns base if available, otherwise base-1, base-2, …
func (r *WorkspaceRepository) UniqueSlug(base string) (string, error) {
	slug := base
	for i := 1; i <= 100; i++ {
		var count int64
		if err := r.db.Model(&models.Workspace{}).Where("slug = ?", slug).Count(&count).Error; err != nil {
			return "", err
		}
		if count == 0 {
			return slug, nil
		}
		slug = fmt.Sprintf("%s-%d", base, i)
	}
	return "", errors.New("could not generate unique slug")
}
