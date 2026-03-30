package calls

import (
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	lkauth "github.com/livekit/protocol/auth"

	"zync-server/internal/config"
	"zync-server/internal/hub"
	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/repository"
)

// callTracker prevents duplicate call_started broadcasts for the same room.
type callTracker struct {
	mu     sync.Mutex
	active map[uint]string // roomID → kind
}

func newCallTracker() *callTracker {
	return &callTracker{active: make(map[uint]string)}
}

// start marks the room as having an active call. Returns false if already active.
func (ct *callTracker) start(roomID uint, kind string) bool {
	ct.mu.Lock()
	defer ct.mu.Unlock()
	if _, exists := ct.active[roomID]; exists {
		return false
	}
	ct.active[roomID] = kind
	return true
}

func (ct *callTracker) end(roomID uint) {
	ct.mu.Lock()
	defer ct.mu.Unlock()
	delete(ct.active, roomID)
}

func (ct *callTracker) kind(roomID uint) (string, bool) {
	ct.mu.Lock()
	defer ct.mu.Unlock()
	k, ok := ct.active[roomID]
	return k, ok
}

type startCallBody struct {
	Kind string `json:"kind" binding:"required,oneof=voice video"`
}

func parseRoomID(c *gin.Context) (uint, error) {
	id64, err := strconv.ParseUint(c.Param("id"), 10, 64)
	return uint(id64), err
}

// handleToken generates a LiveKit access token for the calling user.
// The client uses this token to connect to LiveKit directly.
func handleToken(roomsRepo *repository.RoomRepository, usersRepo *repository.UserRepository, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		roomID, err := parseRoomID(c)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid room ID")
			return
		}
		isMember, err := roomsRepo.IsMember(roomID, userID)
		if err != nil || !isMember {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Not a member of this room")
			return
		}

		if cfg.LiveKitAPIKey == "" || cfg.LiveKitAPISecret == "" {
			response.Error(c, http.StatusServiceUnavailable, response.CodeInternal, "Call service not configured")
			return
		}

		// Resolve display name from user record
		identity := fmt.Sprintf("user-%d", userID)
		displayName := identity
		if u, err := usersRepo.GetByID(userID); err == nil {
			if u.Username != "" {
				displayName = u.Username
			} else {
				displayName = u.Email
			}
		}

		// LiveKit room name scoped to this chat room
		lkRoom := fmt.Sprintf("chat-%d", roomID)

		grant := &lkauth.VideoGrant{
			RoomJoin: true,
			Room:     lkRoom,
		}
		grant.SetCanPublish(true)
		grant.SetCanSubscribe(true)

		at := lkauth.NewAccessToken(cfg.LiveKitAPIKey, cfg.LiveKitAPISecret)
		at.AddGrant(grant).
			SetIdentity(identity).
			SetName(displayName).
			SetValidFor(2 * time.Hour)

		token, err := at.ToJWT()
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to generate call token")
			return
		}

		response.OK(c, gin.H{
			"token":        token,
			"livekit_url":  cfg.LiveKitURL,
			"livekit_room": lkRoom,
		})
	}
}

// handleStart broadcasts a call_started event to all room members via WS.
// If a call is already active for this room, it silently succeeds so the caller
// can still get a token and join — without spamming other members.
func handleStart(h *hub.Hub, roomsRepo *repository.RoomRepository, ct *callTracker) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		roomID, err := parseRoomID(c)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid room ID")
			return
		}
		isMember, err := roomsRepo.IsMember(roomID, userID)
		if err != nil || !isMember {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Not a member of this room")
			return
		}
		var req startCallBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid body")
			return
		}

		// Only broadcast call_started if no call is already active for this room.
		if ct.start(roomID, req.Kind) {
			roomKey := strconv.FormatUint(uint64(roomID), 10)
			_ = h.BroadcastToRoom(roomKey, gin.H{
				"type":    "call_started",
				"room_id": roomID,
				"from":    userID,
				"kind":    req.Kind,
			})

			memberIDs, _ := roomsRepo.GetMemberIDs(roomID)
			for _, mid := range memberIDs {
				if mid != userID {
					_ = h.NotifyUser(mid, gin.H{
						"type":    "call_started",
						"room_id": roomID,
						"from":    userID,
						"kind":    req.Kind,
					})
				}
			}
		}

		response.OK(c, gin.H{"ok": true})
	}
}

// handleEnd broadcasts a call_ended event to all room members.
func handleEnd(h *hub.Hub, roomsRepo *repository.RoomRepository, ct *callTracker) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		roomID, err := parseRoomID(c)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid room ID")
			return
		}
		isMember, err := roomsRepo.IsMember(roomID, userID)
		if err != nil || !isMember {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Not a member of this room")
			return
		}

		ct.end(roomID)

		roomKey := strconv.FormatUint(uint64(roomID), 10)
		_ = h.BroadcastToRoom(roomKey, gin.H{
			"type":    "call_ended",
			"room_id": roomID,
			"from":    userID,
		})

		memberIDs, _ := roomsRepo.GetMemberIDs(roomID)
		for _, mid := range memberIDs {
			if mid != userID {
				_ = h.NotifyUser(mid, gin.H{
					"type":    "call_ended",
					"room_id": roomID,
				})
			}
		}

		response.OK(c, gin.H{"ok": true})
	}
}

