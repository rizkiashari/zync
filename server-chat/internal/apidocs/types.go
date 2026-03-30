package apidocs

import "time"

// ── Generic ──────────────────────────────────────────────────────────────────

// ErrorEnvelope matches response.Error JSON shape.
type ErrorEnvelope struct {
	Success bool `json:"success" example:"false"`
	Error   struct {
		Code    string `json:"code"    example:"INVALID_BODY"`
		Message string `json:"message" example:"Invalid or malformed request body"`
	} `json:"error"`
}

type OKMessage struct {
	Success bool `json:"success" example:"true"`
	Data    struct {
		Message string `json:"message" example:"Done"`
	} `json:"data"`
}

type HealthResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Status string `json:"status" example:"ok"`
	} `json:"data"`
}

// ── Auth ─────────────────────────────────────────────────────────────────────

type RegisterRequest struct {
	Email    string `json:"email"    example:"user@example.com"`
	Password string `json:"password" example:"longpassword123"`
	Username string `json:"username" example:"john_doe"`
}

type AuthCredentials struct {
	Email    string `json:"email"    example:"user@example.com"`
	Password string `json:"password" example:"longpassword123"`
}

type UserPayload struct {
	ID         uint       `json:"id"`
	Email      string     `json:"email"      example:"user@example.com"`
	Username   string     `json:"username"   example:"john_doe"`
	Avatar     string     `json:"avatar"     example:"https://..."`
	Bio        string     `json:"bio"        example:"Hello!"`
	IsOnline   bool       `json:"is_online"`
	LastSeenAt *time.Time `json:"last_seen_at"`
}

type AuthSuccess struct {
	Success bool `json:"success"`
	Data    struct {
		AccessToken  string      `json:"access_token"`
		RefreshToken string      `json:"refresh_token"`
		User         UserPayload `json:"user"`
	} `json:"data"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" example:"a1b2c3..."`
}

type RefreshSuccess struct {
	Success bool `json:"success"`
	Data    struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
	} `json:"data"`
}

// ── Profile ───────────────────────────────────────────────────────────────────

type UpdateProfileRequest struct {
	Username string `json:"username" example:"new_name"`
	Avatar   string `json:"avatar"   example:"https://..."`
	Bio      string `json:"bio"      example:"Updated bio"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" example:"oldpass123"`
	NewPassword     string `json:"new_password"     example:"newpass456"`
}

type ProfileSuccess struct {
	Success bool        `json:"success"`
	Data    UserPayload `json:"data"`
}

// ── Users ─────────────────────────────────────────────────────────────────────

type UsersListSuccess struct {
	Success bool          `json:"success"`
	Data    []UserPayload `json:"data"`
}

// ── Rooms ─────────────────────────────────────────────────────────────────────

type RoomPayload struct {
	ID              uint      `json:"id"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	Type            string    `json:"type"        enums:"group,direct"`
	Name            string    `json:"name"        example:"Team Alpha"`
	Description     string    `json:"description" example:"Backend discussions"`
	CreatorID       uint      `json:"creator_id"`
	PinnedMessageID *uint     `json:"pinned_message_id"`
	InviteToken     string    `json:"invite_token,omitempty"`
}

type RoomSuccess struct {
	Success bool        `json:"success"`
	Data    RoomPayload `json:"data"`
}

type RoomsListSuccess struct {
	Success bool          `json:"success"`
	Data    []RoomPayload `json:"data"`
}

type CreateGroupRequest struct {
	Name        string `json:"name"        example:"Team Alpha"`
	Description string `json:"description" example:"Backend discussions"`
}

type CreateDirectRequest struct {
	UserID uint `json:"user_id" example:"2"`
}

type UpdateGroupRequest struct {
	Name        string `json:"name"        example:"New Name"`
	Description string `json:"description" example:"New description"`
}

type MemberDetail struct {
	UserPayload
	Role     string    `json:"role"      example:"admin"`
	JoinedAt time.Time `json:"joined_at"`
}

type RoomDetailSuccess struct {
	Success bool `json:"success"`
	Data    struct {
		Room    RoomPayload    `json:"room"`
		Members []MemberDetail `json:"members"`
	} `json:"data"`
}

type AddMemberRequest struct {
	UserID uint `json:"user_id" example:"5"`
}

type ChangeMemberRoleRequest struct {
	Role string `json:"role" example:"admin" enums:"admin,member"`
}

type PinMessageRequest struct {
	MessageID *uint `json:"message_id" example:"42"`
}

type InviteTokenSuccess struct {
	Success bool `json:"success"`
	Data    struct {
		InviteToken string `json:"invite_token" example:"a1b2c3d4..."`
	} `json:"data"`
}

// ── Messages ──────────────────────────────────────────────────────────────────

type MessageItem struct {
	ID        uint       `json:"id"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	RoomID    uint       `json:"room_id"`
	SenderID  uint       `json:"sender_id"`
	Body      string     `json:"body"        example:"Hello!"`
	ReplyToID *uint      `json:"reply_to_id"`
	EditedAt  *time.Time `json:"edited_at"`
	IsDeleted bool       `json:"is_deleted"`
}

type MessagesSuccess struct {
	Success bool          `json:"success"`
	Data    []MessageItem `json:"data"`
}

type MessageSuccess struct {
	Success bool        `json:"success"`
	Data    MessageItem `json:"data"`
}

type EditMessageRequest struct {
	Body string `json:"body" example:"Edited content"`
}

type ReactionItem struct {
	Emoji string `json:"emoji" example:"👍"`
	Count int64  `json:"count" example:"3"`
}

type ReactionsSuccess struct {
	Success bool           `json:"success"`
	Data    []ReactionItem `json:"data"`
}

type AddReactionRequest struct {
	Emoji string `json:"emoji" example:"👍"`
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

type DashboardSuccess struct {
	Success bool `json:"success"`
	Data    struct {
		Stats struct {
			RoomCount   int64 `json:"room_count"   example:"5"`
			OnlineUsers int64 `json:"online_users" example:"3"`
		} `json:"stats"`
		Rooms       []RoomPayload `json:"rooms"`
		OnlineUsers []UserPayload `json:"online_users"`
	} `json:"data"`
}

// ── Notifications ─────────────────────────────────────────────────────────────

type NotificationItem struct {
	ID        uint       `json:"id"`
	CreatedAt time.Time  `json:"created_at"`
	UserID    uint       `json:"user_id"`
	Type      string     `json:"type"       example:"mention"`
	RoomID    uint       `json:"room_id"`
	MessageID uint       `json:"message_id"`
	FromID    uint       `json:"from_id"`
	Body      string     `json:"body"       example:"@you in #general"`
	ReadAt    *time.Time `json:"read_at"`
}

type NotificationsSuccess struct {
	Success bool `json:"success"`
	Data    struct {
		Notifications []NotificationItem `json:"notifications"`
		UnreadCount   int64              `json:"unread_count" example:"2"`
	} `json:"data"`
}
