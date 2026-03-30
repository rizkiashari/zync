package rooms

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"zync-server/internal/hub"
	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

type createGroupBody struct {
	Name        string `json:"name"        binding:"required,min=1,max=128"`
	Description string `json:"description" binding:"omitempty,max=256"`
	MemberIDs   []uint `json:"member_ids"`
}

type createDirectBody struct {
	UserID uint `json:"user_id" binding:"required"`
}

type addMemberBody struct {
	UserID uint `json:"user_id" binding:"required"`
}

type updateGroupBody struct {
	Name        string `json:"name"        binding:"omitempty,min=1,max=128"`
	Description string `json:"description" binding:"omitempty,max=256"`
}

type changeMemberRoleBody struct {
	Role string `json:"role" binding:"required,oneof=admin member"`
}

type pinMessageBody struct {
	MessageID *uint `json:"message_id"` // null = unpin
}

func handleCreateGroup(h *hub.Hub, roomsRepo *repository.RoomRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		workspaceID, _ := middleware.WorkspaceID(c)
		var req createGroupBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid or malformed request body")
			return
		}
		room, err := roomsRepo.CreateGroup(userID, workspaceID, req.Name)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if req.Description != "" {
			_ = roomsRepo.UpdateGroup(room.ID, room.Name, req.Description)
			room.Description = req.Description
		}
		// Add additional members and notify each one
		for _, memberID := range req.MemberIDs {
			if memberID != userID {
				_ = roomsRepo.AddMember(room.ID, memberID)
				_ = h.NotifyUser(memberID, map[string]any{"type": "room_added", "room": room})
			}
		}
		response.Created(c, room)
	}
}

func handleCreateDirect(h *hub.Hub, roomsRepo *repository.RoomRepository, usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		workspaceID, _ := middleware.WorkspaceID(c)
		var req createDirectBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid or malformed request body")
			return
		}
		if req.UserID == userID {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Cannot start a direct chat with yourself")
			return
		}
		other, err := usersRepo.GetByID(req.UserID)
		if err != nil || other == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "User not found")
			return
		}
		room, err := roomsRepo.CreateDirect(userID, req.UserID, workspaceID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		// Notify the other user so the room appears in their sidebar in real-time
		_ = h.NotifyUser(req.UserID, map[string]any{"type": "room_added", "room": room})
		response.OK(c, room)
	}
}

func handleList(roomsRepo *repository.RoomRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		workspaceID, _ := middleware.WorkspaceID(c)
		list, err := roomsRepo.ListForUserWithPreview(userID, workspaceID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if list == nil {
			list = make([]repository.RoomWithPreview, 0)
		}
		response.OK(c, list)
	}
}

func handleGetRoom(roomsRepo *repository.RoomRepository) gin.HandlerFunc {
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
		room, err := roomsRepo.GetByID(roomID)
		if err != nil || room == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Room not found")
			return
		}
		isMember, err := roomsRepo.IsMember(roomID, userID)
		if err != nil || !isMember {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "You are not a member of this room")
			return
		}
		members, err := roomsRepo.GetMembers(roomID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"room": room, "members": members})
	}
}

func handleUpdateRoom(roomsRepo *repository.RoomRepository) gin.HandlerFunc {
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
		room, err := roomsRepo.GetByID(roomID)
		if err != nil || room == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Room not found")
			return
		}
		if room.Type != models.RoomTypeGroup {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidRoom, "Only group rooms can be updated")
			return
		}
		isAdmin, err := roomsRepo.IsAdmin(roomID, userID)
		if err != nil || !isAdmin {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Only admins can update the room")
			return
		}
		var req updateGroupBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid or malformed request body")
			return
		}
		name := req.Name
		if name == "" {
			name = room.Name
		}
		if err := roomsRepo.UpdateGroup(roomID, name, req.Description); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		updated, _ := roomsRepo.GetByID(roomID)
		response.OK(c, updated)
	}
}

func handleAddMember(roomsRepo *repository.RoomRepository, usersRepo *repository.UserRepository) gin.HandlerFunc {
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
		room, err := roomsRepo.GetByID(roomID)
		if err != nil || room == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Room not found")
			return
		}
		if room.Type != models.RoomTypeGroup {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidRoom, "Cannot add members to a direct room")
			return
		}
		isAdmin, err := roomsRepo.IsAdmin(roomID, userID)
		if err != nil || !isAdmin {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Only admins can add members")
			return
		}
		var req addMemberBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid or malformed request body")
			return
		}
		target, err := usersRepo.GetByID(req.UserID)
		if err != nil || target == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "User not found")
			return
		}
		if err := roomsRepo.AddMember(roomID, req.UserID); err != nil {
			if err.Error() == "already_member" {
				response.Error(c, http.StatusConflict, response.CodeAlreadyMember, "User is already a member of this room")
				return
			}
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"message": "Member added successfully"})
	}
}

func handleRemoveMember(roomsRepo *repository.RoomRepository) gin.HandlerFunc {
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
		targetID, err := parseUserID(c)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid user ID")
			return
		}
		room, err := roomsRepo.GetByID(roomID)
		if err != nil || room == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Room not found")
			return
		}
		if room.Type != models.RoomTypeGroup {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidRoom, "Cannot remove members from a direct room")
			return
		}
		isAdmin, err := roomsRepo.IsAdmin(roomID, userID)
		if err != nil || !isAdmin {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Only admins can remove members")
			return
		}
		if targetID == userID {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Use the leave endpoint to remove yourself")
			return
		}
		isMember, err := roomsRepo.IsMember(roomID, targetID)
		if err != nil || !isMember {
			response.Error(c, http.StatusNotFound, response.CodeNotMember, "User is not a member of this room")
			return
		}
		if err := roomsRepo.RemoveMember(roomID, targetID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"message": "Member removed successfully"})
	}
}

func handleDeleteRoom(h *hub.Hub, roomsRepo *repository.RoomRepository) gin.HandlerFunc {
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
		room, err := roomsRepo.GetByID(roomID)
		if err != nil || room == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Room not found")
			return
		}
		isMember, err := roomsRepo.IsMember(roomID, userID)
		if err != nil || !isMember {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "You are not a member of this room")
			return
		}
		// Group: only admin can delete; Direct: any member can delete
		if room.Type == models.RoomTypeGroup {
			isAdmin, err := roomsRepo.IsAdmin(roomID, userID)
			if err != nil || !isAdmin {
				response.Error(c, http.StatusForbidden, response.CodeForbidden, "Only admins can delete a group")
				return
			}
		}
		// Collect member IDs before deletion so we can notify them
		memberIDs, _ := roomsRepo.GetMemberIDs(roomID)
		if err := roomsRepo.DeleteRoom(roomID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		// Notify all other members that the room was deleted
		for _, memberID := range memberIDs {
			if memberID != userID {
				_ = h.NotifyUser(memberID, map[string]any{"type": "room_deleted", "room_id": roomID})
			}
		}
		response.OK(c, gin.H{"message": "Room deleted"})
	}
}

func handleLeaveRoom(roomsRepo *repository.RoomRepository) gin.HandlerFunc {
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
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "You are not a member of this room")
			return
		}
		if err := roomsRepo.LeaveRoom(roomID, userID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"message": "You have left the room"})
	}
}

func handleChangeMemberRole(roomsRepo *repository.RoomRepository) gin.HandlerFunc {
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
		targetID, err := parseUserID(c)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid user ID")
			return
		}
		isAdmin, err := roomsRepo.IsAdmin(roomID, userID)
		if err != nil || !isAdmin {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Only admins can change member roles")
			return
		}
		var req changeMemberRoleBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid or malformed request body")
			return
		}
		isMember, err := roomsRepo.IsMember(roomID, targetID)
		if err != nil || !isMember {
			response.Error(c, http.StatusNotFound, response.CodeNotMember, "User is not a member of this room")
			return
		}
		if err := roomsRepo.SetMemberRole(roomID, targetID, req.Role); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"message": "Role updated successfully"})
	}
}

func handlePinMessage(roomsRepo *repository.RoomRepository) gin.HandlerFunc {
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
		isAdmin, err := roomsRepo.IsAdmin(roomID, userID)
		if err != nil || !isAdmin {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Only admins can pin messages")
			return
		}
		var req pinMessageBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid or malformed request body")
			return
		}
		if err := roomsRepo.PinMessage(roomID, req.MessageID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"message": "Pinned message updated"})
	}
}

func handleGenerateInvite(roomsRepo *repository.RoomRepository) gin.HandlerFunc {
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
		room, err := roomsRepo.GetByID(roomID)
		if err != nil || room == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Room not found")
			return
		}
		if room.Type != models.RoomTypeGroup {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidRoom, "Invite links are only for group rooms")
			return
		}
		isAdmin, err := roomsRepo.IsAdmin(roomID, userID)
		if err != nil || !isAdmin {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Only admins can manage invite links")
			return
		}
		token, err := roomsRepo.RegenerateInviteToken(roomID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"invite_token": token})
	}
}

func handleJoinByInvite(roomsRepo *repository.RoomRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		token := c.Param("token")
		room, err := roomsRepo.GetByInviteToken(token)
		if err != nil || room == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Invalid or expired invite link")
			return
		}
		if err := roomsRepo.AddMember(room.ID, userID); err != nil {
			if err.Error() == "already_member" {
				response.OK(c, room)
				return
			}
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, room)
	}
}

func parseRoomID(c *gin.Context) (uint, error) {
	id64, err := strconv.ParseUint(c.Param("id"), 10, 64)
	return uint(id64), err
}

func parseUserID(c *gin.Context) (uint, error) {
	id64, err := strconv.ParseUint(c.Param("userId"), 10, 64)
	return uint(id64), err
}
