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

// MemberWithUser holds workspace member info joined with user details.
type MemberWithUser struct {
	UserID    uint      `json:"user_id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Avatar    string    `json:"avatar"`
	Role      string    `json:"role"`
	JoinedAt  time.Time `json:"joined_at"`
}

// ListMembers returns all members of a workspace with user details.
func (r *WorkspaceRepository) ListMembers(workspaceID uint) ([]MemberWithUser, error) {
	var members []MemberWithUser
	err := r.db.Table("workspace_members").
		Select("workspace_members.user_id, users.username, users.email, users.avatar, workspace_members.role, workspace_members.joined_at").
		Joins("JOIN users ON users.id = workspace_members.user_id").
		Where("workspace_members.workspace_id = ?", workspaceID).
		Order("workspace_members.joined_at ASC").
		Scan(&members).Error
	if members == nil {
		members = make([]MemberWithUser, 0)
	}
	return members, err
}

// UpdateMemberRole changes the role of a workspace member.
func (r *WorkspaceRepository) UpdateMemberRole(workspaceID, userID uint, role string) error {
	return r.db.Model(&models.WorkspaceMember{}).
		Where("workspace_id = ? AND user_id = ?", workspaceID, userID).
		Update("role", role).Error
}

// RemoveMember removes a user from a workspace.
func (r *WorkspaceRepository) RemoveMember(workspaceID, userID uint) error {
	return r.db.Where("workspace_id = ? AND user_id = ?", workspaceID, userID).
		Delete(&models.WorkspaceMember{}).Error
}

// RegenerateInviteToken creates a fresh invite token for the workspace.
func (r *WorkspaceRepository) RegenerateInviteToken(workspaceID uint) (string, error) {
	token := genWorkspaceToken()
	err := r.db.Model(&models.Workspace{}).Where("id = ?", workspaceID).Update("invite_token", token).Error
	return token, err
}

// UpdateBranding updates white-label fields on a workspace.
func (r *WorkspaceRepository) UpdateBranding(workspaceID uint, customName, primaryColor, logoURL, description string) error {
	updates := map[string]interface{}{
		"custom_name":   customName,
		"primary_color": primaryColor,
		"description":   description,
	}
	if logoURL != "" {
		updates["logo_url"] = logoURL
	}
	return r.db.Model(&models.Workspace{}).Where("id = ?", workspaceID).Updates(updates).Error
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

// WorkspaceAnalytics holds aggregated stats for a workspace.
type WorkspaceAnalytics struct {
	TotalMessages    int64          `json:"total_messages"`
	Messages30Days   int64          `json:"messages_30_days"`
	ActiveUsers7Days int64          `json:"active_users_7_days"`
	TotalRooms       int64          `json:"total_rooms"`
	TotalGroups      int64          `json:"total_groups"`
	TotalDMs         int64          `json:"total_dms"`
	TotalMembers     int64          `json:"total_members"`
	TotalTasks       int64          `json:"total_tasks"`
	TopRooms         []TopRoom      `json:"top_rooms"`
	DailyMessages    []DailyMessage `json:"daily_messages"`
}

// TopRoom holds message count for a room.
type TopRoom struct {
	RoomID   uint   `json:"room_id"`
	RoomName string `json:"room_name"`
	Count    int64  `json:"count"`
}

// DailyMessage holds message count per day.
type DailyMessage struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

// GetAnalytics returns aggregated workspace stats.
func (r *WorkspaceRepository) GetAnalytics(workspaceID uint) (*WorkspaceAnalytics, error) {
	a := &WorkspaceAnalytics{}

	// Total messages
	r.db.Model(&models.Message{}).
		Joins("JOIN rooms ON rooms.id = messages.room_id").
		Where("rooms.workspace_id = ?", workspaceID).
		Count(&a.TotalMessages)

	// Messages last 30 days
	since30 := time.Now().UTC().AddDate(0, 0, -30)
	r.db.Model(&models.Message{}).
		Joins("JOIN rooms ON rooms.id = messages.room_id").
		Where("rooms.workspace_id = ? AND messages.created_at >= ?", workspaceID, since30).
		Count(&a.Messages30Days)

	// Active users last 7 days (sent at least one message)
	since7 := time.Now().UTC().AddDate(0, 0, -7)
	r.db.Model(&models.Message{}).
		Joins("JOIN rooms ON rooms.id = messages.room_id").
		Where("rooms.workspace_id = ? AND messages.created_at >= ?", workspaceID, since7).
		Distinct("messages.sender_id").
		Count(&a.ActiveUsers7Days)

	// Total rooms / groups / DMs
	r.db.Model(&models.Room{}).Where("workspace_id = ?", workspaceID).Count(&a.TotalRooms)
	r.db.Model(&models.Room{}).Where("workspace_id = ? AND is_group = true", workspaceID).Count(&a.TotalGroups)
	r.db.Model(&models.Room{}).Where("workspace_id = ? AND is_group = false", workspaceID).Count(&a.TotalDMs)

	// Total members
	r.db.Model(&models.WorkspaceMember{}).Where("workspace_id = ?", workspaceID).Count(&a.TotalMembers)

	// Total tasks
	r.db.Model(&models.Task{}).
		Joins("JOIN task_boards ON task_boards.id = tasks.board_id").
		Joins("JOIN rooms ON rooms.id = task_boards.room_id").
		Where("rooms.workspace_id = ?", workspaceID).
		Count(&a.TotalTasks)

	// Top 5 rooms by message count
	var topRooms []TopRoom
	r.db.Raw(`
		SELECT rooms.id as room_id, rooms.name as room_name, COUNT(messages.id) as count
		FROM messages
		JOIN rooms ON rooms.id = messages.room_id
		WHERE rooms.workspace_id = ?
		GROUP BY rooms.id, rooms.name
		ORDER BY count DESC
		LIMIT 5
	`, workspaceID).Scan(&topRooms)
	if topRooms == nil {
		topRooms = []TopRoom{}
	}
	a.TopRooms = topRooms

	// Daily messages last 30 days
	var daily []DailyMessage
	r.db.Raw(`
		SELECT TO_CHAR(messages.created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
		FROM messages
		JOIN rooms ON rooms.id = messages.room_id
		WHERE rooms.workspace_id = ? AND messages.created_at >= ?
		GROUP BY date
		ORDER BY date ASC
	`, workspaceID, since30).Scan(&daily)
	if daily == nil {
		daily = []DailyMessage{}
	}
	a.DailyMessages = daily

	return a, nil
}
