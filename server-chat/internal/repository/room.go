package repository

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"gorm.io/gorm"

	"zync-server/internal/models"
)

type RoomRepository struct {
	db *gorm.DB
}

func NewRoomRepository(db *gorm.DB) *RoomRepository {
	return &RoomRepository{db: db}
}

// RoomWithPreview is Room enriched with member count and last message info.
type RoomWithPreview struct {
	models.Room
	LastMessage   string    `json:"last_message"`
	LastMessageAt time.Time `json:"last_message_at"`
	MemberCount   int64     `json:"member_count"`
	UnreadCount   int64     `json:"unread_count"`
}

// MemberDetail is a user with their role in a room.
type MemberDetail struct {
	models.User
	Role     string    `json:"role"`
	JoinedAt time.Time `json:"joined_at"`
}

func generateToken() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func (r *RoomRepository) CreateGroup(creatorID, workspaceID uint, name string) (*models.Room, error) {
	var room models.Room
	err := r.db.Transaction(func(tx *gorm.DB) error {
		room = models.Room{
			WorkspaceID: workspaceID,
			Type:        models.RoomTypeGroup,
			Name:        name,
			CreatorID:   creatorID,
			InviteToken: generateToken(),
		}
		if err := tx.Create(&room).Error; err != nil {
			return err
		}
		m := models.RoomMember{
			RoomID:   room.ID,
			UserID:   creatorID,
			JoinedAt: time.Now().UTC(),
			Role:     models.RoleAdmin,
		}
		return tx.Create(&m).Error
	})
	if err != nil {
		return nil, err
	}
	return &room, nil
}

// CreateDirect returns an existing DM between two users or creates one.
func (r *RoomRepository) CreateDirect(a, b, workspaceID uint) (*models.Room, error) {
	if a == b {
		return nil, errors.New("cannot open direct room with self")
	}
	var existing models.Room
	err := r.db.
		Model(&models.Room{}).
		Joins("JOIN room_members m1 ON m1.room_id = rooms.id AND m1.user_id = ?", a).
		Joins("JOIN room_members m2 ON m2.room_id = rooms.id AND m2.user_id = ?", b).
		Where("rooms.type = ? AND rooms.workspace_id = ?", models.RoomTypeDirect, workspaceID).
		First(&existing).Error
	if err == nil {
		return &existing, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	var room models.Room
	err = r.db.Transaction(func(tx *gorm.DB) error {
		room = models.Room{WorkspaceID: workspaceID, Type: models.RoomTypeDirect}
		if err := tx.Create(&room).Error; err != nil {
			return err
		}
		now := time.Now().UTC()
		for _, uid := range []uint{a, b} {
			m := models.RoomMember{RoomID: room.ID, UserID: uid, JoinedAt: now, Role: models.RoleMember}
			if err := tx.Create(&m).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &room, nil
}

func (r *RoomRepository) IsMember(roomID, userID uint) (bool, error) {
	// Tenant isolation:
	// User is allowed to access a room only if they are a member of the room
	// AND also a member of the workspace that owns the room.
	var n int64
	// If user is system admin, bypass workspace_members isolation.
	err := r.db.Table("room_members").
		Select("COUNT(*)").
		Joins("JOIN rooms ON rooms.id = room_members.room_id").
		Joins("JOIN users ON users.id = room_members.user_id").
		Joins("LEFT JOIN workspace_members ON workspace_members.workspace_id = rooms.workspace_id AND workspace_members.user_id = room_members.user_id").
		Where("room_members.room_id = ? AND room_members.user_id = ? AND (users.is_system_admin = ? OR workspace_members.workspace_id IS NOT NULL)", roomID, userID, true).
		Count(&n).Error
	return n > 0, err
}

func (r *RoomRepository) GetByID(roomID uint) (*models.Room, error) {
	var room models.Room
	err := r.db.First(&room, roomID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &room, nil
}

func (r *RoomRepository) GetByInviteToken(token string) (*models.Room, error) {
	var room models.Room
	err := r.db.Where("invite_token = ? AND type = ?", token, models.RoomTypeGroup).First(&room).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &room, nil
}

// RegenerateInviteToken creates a new invite token for a room.
func (r *RoomRepository) RegenerateInviteToken(roomID uint) (string, error) {
	token := generateToken()
	err := r.db.Model(&models.Room{}).Where("id = ?", roomID).Update("invite_token", token).Error
	return token, err
}

func (r *RoomRepository) ListForUser(userID, workspaceID uint) ([]models.Room, error) {
	var rooms []models.Room
	err := r.db.
		Joins("JOIN room_members ON room_members.room_id = rooms.id").
		Where("room_members.user_id = ? AND rooms.workspace_id = ?", userID, workspaceID).
		Order("rooms.updated_at DESC").
		Find(&rooms).Error
	return rooms, err
}

// GetMembers returns all members of a room with their user details and role.
func (r *RoomRepository) GetMembers(roomID uint) ([]MemberDetail, error) {
	type rawRow struct {
		models.User
		Role     string    `gorm:"column:role"`
		JoinedAt time.Time `gorm:"column:joined_at"`
	}
	var rows []rawRow
	err := r.db.
		Model(&models.User{}).
		Select("users.*, room_members.role, room_members.joined_at").
		Joins("JOIN room_members ON room_members.user_id = users.id").
		Joins("JOIN rooms ON rooms.id = room_members.room_id").
		Joins("JOIN workspace_members wm ON wm.workspace_id = rooms.workspace_id AND wm.user_id = users.id").
		Where("room_members.room_id = ?", roomID).
		Order("room_members.joined_at ASC").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	members := make([]MemberDetail, len(rows))
	for i, row := range rows {
		members[i] = MemberDetail{User: row.User, Role: row.Role, JoinedAt: row.JoinedAt}
	}
	return members, nil
}

// IsAdmin returns true if the user has the admin role in the room, or is a system (maintenance) admin.
func (r *RoomRepository) IsAdmin(roomID, userID uint) (bool, error) {
	type adminRow struct {
		Role          string `gorm:"column:role"`
		IsSystemAdmin bool   `gorm:"column:is_system_admin"`
	}
	var row adminRow
	err := r.db.
		Table("room_members").
		Select("room_members.role, users.is_system_admin").
		Joins("JOIN rooms ON rooms.id = room_members.room_id").
		Joins("JOIN users ON users.id = room_members.user_id").
		Joins("LEFT JOIN workspace_members ON workspace_members.workspace_id = rooms.workspace_id AND workspace_members.user_id = room_members.user_id").
		Where(
			"room_members.room_id = ? AND room_members.user_id = ? AND (users.is_system_admin = ? OR workspace_members.workspace_id IS NOT NULL)",
			roomID,
			userID,
			true,
		).
		First(&row).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}
	return row.Role == models.RoleAdmin || row.IsSystemAdmin, nil
}

// AddMember adds a user to a group room as a regular member.
func (r *RoomRepository) AddMember(roomID, userID uint) error {
	already, err := r.IsMember(roomID, userID)
	if err != nil {
		return err
	}
	if already {
		return errors.New("already_member")
	}
	m := models.RoomMember{
		RoomID:   roomID,
		UserID:   userID,
		JoinedAt: time.Now().UTC(),
		Role:     models.RoleMember,
	}
	return r.db.Create(&m).Error
}

// RemoveMember removes a user from a room.
func (r *RoomRepository) RemoveMember(roomID, userID uint) error {
	return r.db.Where("room_id = ? AND user_id = ?", roomID, userID).
		Delete(&models.RoomMember{}).Error
}

// LeaveRoom removes the calling user from a room.
func (r *RoomRepository) LeaveRoom(roomID, userID uint) error {
	return r.db.Where("room_id = ? AND user_id = ?", roomID, userID).
		Delete(&models.RoomMember{}).Error
}

// DeleteMembershipInWorkspaceTx removes room_members and room_reads for user from all rooms in the workspace (use inside a transaction).
func (r *RoomRepository) DeleteMembershipInWorkspaceTx(tx *gorm.DB, workspaceID, userID uint) error {
	roomSub := tx.Model(&models.Room{}).Select("id").Where("workspace_id = ?", workspaceID)
	if err := tx.Where("user_id = ? AND room_id IN (?)", userID, roomSub).Delete(&models.RoomMember{}).Error; err != nil {
		return err
	}
	return tx.Where("user_id = ? AND room_id IN (?)", userID, roomSub).Delete(&models.RoomRead{}).Error
}

// UpdateGroup updates name and/or description of a group room.
func (r *RoomRepository) UpdateGroup(roomID uint, name, description string) error {
	return r.db.Model(&models.Room{}).Where("id = ?", roomID).Updates(map[string]any{
		"name":        name,
		"description": description,
	}).Error
}

// SetMemberRole changes a member's role (admin/member).
func (r *RoomRepository) SetMemberRole(roomID, userID uint, role string) error {
	return r.db.Model(&models.RoomMember{}).
		Where("room_id = ? AND user_id = ?", roomID, userID).
		Update("role", role).Error
}

// PinMessage sets the pinned message for a room (nil to unpin).
func (r *RoomRepository) PinMessage(roomID uint, messageID *uint) error {
	return r.db.Model(&models.Room{}).Where("id = ?", roomID).
		Update("pinned_message_id", messageID).Error
}

// UpdateLastRead upserts the user's last-read message position in a room.
func (r *RoomRepository) UpdateLastRead(roomID, userID, msgID uint) error {
	return r.db.Save(&models.RoomRead{
		RoomID:        roomID,
		UserID:        userID,
		LastReadMsgID: msgID,
		UpdatedAt:     time.Now().UTC(),
	}).Error
}

// GetLastRead returns the last-read message ID for a user in a room.
func (r *RoomRepository) GetLastRead(roomID, userID uint) (uint, error) {
	var rr models.RoomRead
	err := r.db.Where("room_id = ? AND user_id = ?", roomID, userID).First(&rr).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, nil
		}
		return 0, err
	}
	return rr.LastReadMsgID, nil
}

// GetDashboardStats returns how many rooms the user belongs to in the workspace.
func (r *RoomRepository) GetDashboardStats(userID, workspaceID uint) (roomCount, onlineCount int64, err error) {
	err = r.db.Model(&models.RoomMember{}).
		Joins("JOIN rooms ON rooms.id = room_members.room_id").
		Where("room_members.user_id = ? AND rooms.workspace_id = ?", userID, workspaceID).
		Count(&roomCount).Error
	if err != nil {
		return
	}
	err = r.db.Model(&models.User{}).Where("is_online = true").Count(&onlineCount).Error
	return
}

// DeleteRoom removes a room and all its members, messages, and read records.
func (r *RoomRepository) DeleteRoom(roomID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		tx.Where("room_id = ?", roomID).Delete(&models.RoomRead{})
		tx.Where("room_id = ?", roomID).Delete(&models.RoomMember{})
		tx.Where("room_id = ?", roomID).Delete(&models.Message{})
		return tx.Delete(&models.Room{}, roomID).Error
	})
}

// GetMemberIDs returns the user IDs of all members of a room.
func (r *RoomRepository) GetMemberIDs(roomID uint) ([]uint, error) {
	var ids []uint
	// Only return members that are also workspace members (tenant isolation).
	err := r.db.Table("room_members").
		Select("room_members.user_id").
		Joins("JOIN rooms ON rooms.id = room_members.room_id").
		Joins("JOIN workspace_members ON workspace_members.workspace_id = rooms.workspace_id AND workspace_members.user_id = room_members.user_id").
		Where("room_members.room_id = ?", roomID).
		Pluck("room_members.user_id", &ids).Error
	return ids, err
}

// ListForUserWithPreview returns rooms for a user enriched with member count and last message preview.
// A single CTE query replaces the previous N+1 loop.
func (r *RoomRepository) ListForUserWithPreview(userID, workspaceID uint) ([]RoomWithPreview, error) {
	type row struct {
		models.Room
		LastMessage   string    `gorm:"column:last_message"`
		LastMessageAt time.Time `gorm:"column:last_message_at"`
		MemberCount   int64     `gorm:"column:member_count"`
		UnreadCount   int64     `gorm:"column:unread_count"`
	}

	query := `
WITH user_rooms AS (
    SELECT rooms.*
    FROM rooms
    JOIN room_members ON room_members.room_id = rooms.id
    WHERE room_members.user_id = ? AND rooms.workspace_id = ?
),
last_msgs AS (
    SELECT DISTINCT ON (room_id)
        room_id,
        body    AS last_message,
        created_at AS last_message_at
    FROM messages
    WHERE is_deleted = false
    ORDER BY room_id, created_at DESC
),
member_counts AS (
    SELECT room_id, COUNT(*) AS member_count
    FROM room_members
    GROUP BY room_id
),
last_reads AS (
    SELECT room_id, last_read_msg_id
    FROM room_reads
    WHERE user_id = ?
),
unread_counts AS (
    SELECT m.room_id, COUNT(*) AS unread_count
    FROM messages m
    JOIN last_reads lr ON lr.room_id = m.room_id
    WHERE m.id > lr.last_read_msg_id
      AND m.sender_id != ?
      AND m.is_deleted = false
    GROUP BY m.room_id
)
SELECT
    ur.*,
    COALESCE(lm.last_message, '')             AS last_message,
    COALESCE(lm.last_message_at, '0001-01-01'::timestamptz) AS last_message_at,
    COALESCE(mc.member_count, 0)              AS member_count,
    COALESCE(uc.unread_count, 0)              AS unread_count
FROM user_rooms ur
LEFT JOIN last_msgs      lm ON lm.room_id = ur.id
LEFT JOIN member_counts  mc ON mc.room_id = ur.id
LEFT JOIN unread_counts  uc ON uc.room_id = ur.id
ORDER BY ur.updated_at DESC
`
	var rows []row
	if err := r.db.Raw(query, userID, workspaceID, userID, userID).Scan(&rows).Error; err != nil {
		return nil, err
	}

	result := make([]RoomWithPreview, len(rows))
	for i, rw := range rows {
		result[i] = RoomWithPreview{
			Room:          rw.Room,
			LastMessage:   rw.LastMessage,
			LastMessageAt: rw.LastMessageAt,
			MemberCount:   rw.MemberCount,
			UnreadCount:   rw.UnreadCount,
		}
	}
	return result, nil
}
