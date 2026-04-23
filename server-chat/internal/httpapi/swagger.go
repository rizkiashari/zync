package httpapi

import (
	"github.com/gin-gonic/gin"
	openswag "github.com/gopackx/open-swag-go"
	ginadapter "github.com/gopackx/open-swag-go/adapters/gin"

	"zync-server/internal/apidocs"
)

func body(schema interface{}) *openswag.RequestBody {
	return &openswag.RequestBody{Schema: schema, Required: true}
}

func resp(desc string, schema interface{}) openswag.Response {
	return openswag.Response{Description: desc, Schema: schema}
}

func pathParam(name, desc string) openswag.Parameter {
	return openswag.Parameter{Name: name, In: "path", Description: desc, Required: true}
}

func queryParam(name, desc string) openswag.Parameter {
	return openswag.Parameter{Name: name, In: "query", Description: desc}
}

// RegisterSwagger serves OpenAPI UI (Scalar) at /docs/
func RegisterSwagger(r *gin.Engine) {
	docs := openswag.New(openswag.Config{
		Info: openswag.Info{
			Title:       "Zync API",
			Version:     "1.0.0",
			Description: "REST + WebSocket backend for realtime chat (rooms, JWT auth, message history, reactions, notifications).",
		},
		Servers: []openswag.Server{
			{URL: "http://localhost:8080", Description: "Development"},
		},
		Tags: []openswag.Tag{
			{Name: "auth", Description: "Authentication & token management"},
			{Name: "health", Description: "Health check"},
			{Name: "profile", Description: "Current user profile"},
			{Name: "users", Description: "Workspace users"},
			{Name: "rooms", Description: "Chat rooms"},
			{Name: "messages", Description: "Messages & reactions"},
			{Name: "notifications", Description: "Notifications"},
			{Name: "dashboard", Description: "Dashboard stats"},
		},
		UI: openswag.UIConfig{
			Theme:       "purple",
			DarkMode:    true,
			ShowSidebar: true,
		},
	})

	// ── Health ────────────────────────────────────────────────────────────────
	docs.Add(openswag.Endpoint{
		Method:  "GET",
		Path:    "/health",
		Summary: "Health check",
		Tags:    []string{"health"},
		Responses: map[int]openswag.Response{
			200: resp("OK", apidocs.HealthResponse{}),
		},
	})

	// ── Auth ──────────────────────────────────────────────────────────────────
	docs.Add(openswag.Endpoint{
		Method:      "POST",
		Path:        "/auth/register",
		Summary:     "Register account",
		Tags:        []string{"auth"},
		RequestBody: body(apidocs.RegisterRequest{}),
		Responses: map[int]openswag.Response{
			201: resp("Registered", apidocs.AuthSuccess{}),
			400: resp("Bad request", apidocs.ErrorEnvelope{}),
			409: resp("Email already exists", apidocs.ErrorEnvelope{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:      "POST",
		Path:        "/auth/login",
		Summary:     "Login",
		Tags:        []string{"auth"},
		RequestBody: body(apidocs.AuthCredentials{}),
		Responses: map[int]openswag.Response{
			200: resp("Login success", apidocs.AuthSuccess{}),
			400: resp("Bad request", apidocs.ErrorEnvelope{}),
			401: resp("Invalid credentials", apidocs.ErrorEnvelope{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:      "POST",
		Path:        "/auth/refresh",
		Summary:     "Refresh access token",
		Tags:        []string{"auth"},
		RequestBody: body(apidocs.RefreshRequest{}),
		Responses: map[int]openswag.Response{
			200: resp("Token refreshed", apidocs.RefreshSuccess{}),
			401: resp("Invalid refresh token", apidocs.ErrorEnvelope{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:   "POST",
		Path:     "/auth/logout",
		Summary:  "Logout (revoke refresh token)",
		Tags:     []string{"auth"},
		Security: []string{openswag.SecurityBearerAuth},
		Responses: map[int]openswag.Response{
			200: resp("Logged out", apidocs.OKMessage{}),
		},
	})

	// ── Profile ───────────────────────────────────────────────────────────────
	docs.Add(openswag.Endpoint{
		Method:   "GET",
		Path:     "/api/profile",
		Summary:  "Get current user profile",
		Tags:     []string{"profile"},
		Security: []string{openswag.SecurityBearerAuth},
		Responses: map[int]openswag.Response{
			200: resp("Profile", apidocs.ProfileSuccess{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:      "PUT",
		Path:        "/api/profile",
		Summary:     "Update profile",
		Tags:        []string{"profile"},
		Security:    []string{openswag.SecurityBearerAuth},
		RequestBody: body(apidocs.UpdateProfileRequest{}),
		Responses: map[int]openswag.Response{
			200: resp("Updated", apidocs.ProfileSuccess{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:      "PUT",
		Path:        "/api/profile/password",
		Summary:     "Change password",
		Tags:        []string{"profile"},
		Security:    []string{openswag.SecurityBearerAuth},
		RequestBody: body(apidocs.ChangePasswordRequest{}),
		Responses: map[int]openswag.Response{
			200: resp("Password changed", apidocs.OKMessage{}),
			400: resp("Bad request", apidocs.ErrorEnvelope{}),
		},
	})

	// ── Users ─────────────────────────────────────────────────────────────────
	docs.Add(openswag.Endpoint{
		Method:   "GET",
		Path:     "/api/users",
		Summary:  "List workspace users",
		Tags:     []string{"users"},
		Security: []string{openswag.SecurityBearerAuth},
		Responses: map[int]openswag.Response{
			200: resp("Users list", apidocs.UsersListSuccess{}),
		},
	})

	// ── Dashboard ─────────────────────────────────────────────────────────────
	docs.Add(openswag.Endpoint{
		Method:   "GET",
		Path:     "/api/dashboard",
		Summary:  "Dashboard stats",
		Tags:     []string{"dashboard"},
		Security: []string{openswag.SecurityBearerAuth},
		Responses: map[int]openswag.Response{
			200: resp("Dashboard", apidocs.DashboardSuccess{}),
		},
	})

	// ── Rooms ─────────────────────────────────────────────────────────────────
	docs.Add(openswag.Endpoint{
		Method:   "GET",
		Path:     "/api/rooms",
		Summary:  "List rooms",
		Tags:     []string{"rooms"},
		Security: []string{openswag.SecurityBearerAuth},
		Responses: map[int]openswag.Response{
			200: resp("Rooms", apidocs.RoomsListSuccess{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:      "POST",
		Path:        "/api/rooms/group",
		Summary:     "Create group room",
		Tags:        []string{"rooms"},
		Security:    []string{openswag.SecurityBearerAuth},
		RequestBody: body(apidocs.CreateGroupRequest{}),
		Responses: map[int]openswag.Response{
			201: resp("Room created", apidocs.RoomSuccess{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:      "POST",
		Path:        "/api/rooms/direct",
		Summary:     "Create direct room",
		Tags:        []string{"rooms"},
		Security:    []string{openswag.SecurityBearerAuth},
		RequestBody: body(apidocs.CreateDirectRequest{}),
		Responses: map[int]openswag.Response{
			201: resp("Room created", apidocs.RoomSuccess{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:   "GET",
		Path:     "/api/rooms/{id}",
		Summary:  "Get room detail",
		Tags:     []string{"rooms"},
		Security: []string{openswag.SecurityBearerAuth},
		Parameters: []openswag.Parameter{
			pathParam("id", "Room ID"),
		},
		Responses: map[int]openswag.Response{
			200: resp("Room detail", apidocs.RoomDetailSuccess{}),
			404: resp("Not found", apidocs.ErrorEnvelope{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:      "PUT",
		Path:        "/api/rooms/{id}",
		Summary:     "Update group room",
		Tags:        []string{"rooms"},
		Security:    []string{openswag.SecurityBearerAuth},
		RequestBody: body(apidocs.UpdateGroupRequest{}),
		Parameters: []openswag.Parameter{
			pathParam("id", "Room ID"),
		},
		Responses: map[int]openswag.Response{
			200: resp("Updated", apidocs.RoomSuccess{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:   "DELETE",
		Path:     "/api/rooms/{id}",
		Summary:  "Delete room",
		Tags:     []string{"rooms"},
		Security: []string{openswag.SecurityBearerAuth},
		Parameters: []openswag.Parameter{
			pathParam("id", "Room ID"),
		},
		Responses: map[int]openswag.Response{
			200: resp("Deleted", apidocs.OKMessage{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:      "POST",
		Path:        "/api/rooms/{id}/members",
		Summary:     "Add member to room",
		Tags:        []string{"rooms"},
		Security:    []string{openswag.SecurityBearerAuth},
		RequestBody: body(apidocs.AddMemberRequest{}),
		Parameters: []openswag.Parameter{
			pathParam("id", "Room ID"),
		},
		Responses: map[int]openswag.Response{
			200: resp("Member added", apidocs.OKMessage{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:      "PUT",
		Path:        "/api/rooms/{id}/pin",
		Summary:     "Pin message in room",
		Tags:        []string{"rooms"},
		Security:    []string{openswag.SecurityBearerAuth},
		RequestBody: body(apidocs.PinMessageRequest{}),
		Parameters: []openswag.Parameter{
			pathParam("id", "Room ID"),
		},
		Responses: map[int]openswag.Response{
			200: resp("Pinned", apidocs.OKMessage{}),
		},
	})

	// ── Messages ──────────────────────────────────────────────────────────────
	docs.Add(openswag.Endpoint{
		Method:   "GET",
		Path:     "/api/rooms/{id}/messages",
		Summary:  "List messages in room",
		Tags:     []string{"messages"},
		Security: []string{openswag.SecurityBearerAuth},
		Parameters: []openswag.Parameter{
			pathParam("id", "Room ID"),
			queryParam("before", "Cursor: message ID for pagination"),
			queryParam("limit", "Page size (default 50)"),
		},
		Responses: map[int]openswag.Response{
			200: resp("Messages", apidocs.MessagesSuccess{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:      "PUT",
		Path:        "/api/messages/{id}",
		Summary:     "Edit message",
		Tags:        []string{"messages"},
		Security:    []string{openswag.SecurityBearerAuth},
		RequestBody: body(apidocs.EditMessageRequest{}),
		Parameters: []openswag.Parameter{
			pathParam("id", "Message ID"),
		},
		Responses: map[int]openswag.Response{
			200: resp("Edited", apidocs.MessageSuccess{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:   "DELETE",
		Path:     "/api/messages/{id}",
		Summary:  "Delete message",
		Tags:     []string{"messages"},
		Security: []string{openswag.SecurityBearerAuth},
		Parameters: []openswag.Parameter{
			pathParam("id", "Message ID"),
		},
		Responses: map[int]openswag.Response{
			200: resp("Deleted", apidocs.OKMessage{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:      "POST",
		Path:        "/api/messages/{id}/reactions",
		Summary:     "Add reaction to message",
		Tags:        []string{"messages"},
		Security:    []string{openswag.SecurityBearerAuth},
		RequestBody: body(apidocs.AddReactionRequest{}),
		Parameters: []openswag.Parameter{
			pathParam("id", "Message ID"),
		},
		Responses: map[int]openswag.Response{
			200: resp("Reaction added", apidocs.OKMessage{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:   "GET",
		Path:     "/api/messages/{id}/reactions",
		Summary:  "Get reactions for message",
		Tags:     []string{"messages"},
		Security: []string{openswag.SecurityBearerAuth},
		Parameters: []openswag.Parameter{
			pathParam("id", "Message ID"),
		},
		Responses: map[int]openswag.Response{
			200: resp("Reactions", apidocs.ReactionsSuccess{}),
		},
	})

	// ── Notifications ─────────────────────────────────────────────────────────
	docs.Add(openswag.Endpoint{
		Method:   "GET",
		Path:     "/api/notifications",
		Summary:  "List notifications",
		Tags:     []string{"notifications"},
		Security: []string{openswag.SecurityBearerAuth},
		Responses: map[int]openswag.Response{
			200: resp("Notifications", apidocs.NotificationsSuccess{}),
		},
	})

	docs.Add(openswag.Endpoint{
		Method:   "PUT",
		Path:     "/api/notifications/read-all",
		Summary:  "Mark all notifications as read",
		Tags:     []string{"notifications"},
		Security: []string{openswag.SecurityBearerAuth},
		Responses: map[int]openswag.Response{
			200: resp("Marked read", apidocs.OKMessage{}),
		},
	})

	ginadapter.Mount(r, docs, "/docs")
}
