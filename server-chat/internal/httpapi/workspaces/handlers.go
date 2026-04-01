package workspaces

import (
	"fmt"
	"net/http"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

type createWorkspaceBody struct {
	Name string `json:"name" binding:"required,min=2,max=128"`
	Slug string `json:"slug" binding:"omitempty,min=2,max=64"`
}

var nonAlphaNum = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = nonAlphaNum.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if len(s) > 30 {
		s = s[:30]
	}
	if s == "" {
		s = "workspace"
	}
	return s
}

// handleCreate creates a new workspace owned by the requesting user.
func handleCreate(wsRepo *repository.WorkspaceRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		var req createWorkspaceBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid request body")
			return
		}
		base := req.Slug
		if base == "" {
			base = slugify(req.Name)
		} else {
			base = slugify(base)
		}
		slug, err := wsRepo.UniqueSlug(base)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to generate workspace slug")
			return
		}
		ws, err := wsRepo.Create(slug, req.Name, userID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to create workspace")
			return
		}
		response.Created(c, gin.H{"workspace": ws})
	}
}

// handleListMine returns all workspaces the current user belongs to.
func handleListMine(wsRepo *repository.WorkspaceRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		workspaces, err := wsRepo.ListForUser(userID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if workspaces == nil {
			workspaces = make([]models.Workspace, 0)
		}
		response.OK(c, gin.H{"workspaces": workspaces})
	}
}

// handleGetCurrent returns the workspace resolved by the Tenant middleware.
func handleGetCurrent() gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		response.OK(c, gin.H{"workspace": ws})
	}
}

// handleJoin joins a workspace via invite token.
func handleJoin(wsRepo *repository.WorkspaceRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		token := c.Param("token")
		ws, err := wsRepo.GetByInviteToken(token)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		if ws == nil {
			response.Error(c, http.StatusNotFound, "invalid_token", "Invalid or expired invite token")
			return
		}
		if err := wsRepo.AddMember(ws.ID, userID, "member"); err != nil && err.Error() != "already_member" {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to join workspace")
			return
		}
		response.OK(c, gin.H{"workspace": ws})
	}
}

// handleGetInvite returns the current invite token for the workspace.
func handleGetInvite(wsRepo *repository.WorkspaceRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		response.OK(c, gin.H{"invite_token": ws.InviteToken})
	}
}

// handleRegenerateInvite creates a new invite token (admin/owner only).
func handleRegenerateInvite(wsRepo *repository.WorkspaceRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		userID, _ := middleware.UserID(c)
		role, _ := wsRepo.GetMemberRole(ws.ID, userID)
		if role != "owner" && role != "admin" {
			response.Error(c, http.StatusForbidden, "forbidden", "Only admin or owner can regenerate invite link")
			return
		}
		token, err := wsRepo.RegenerateInviteToken(ws.ID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"invite_token": token})
	}
}

// handleListMembers returns all members of the workspace.
func handleListMembers(wsRepo *repository.WorkspaceRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		members, err := wsRepo.ListMembers(ws.ID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, gin.H{"members": members})
	}
}

type updateMemberRoleBody struct {
	Role string `json:"role" binding:"required,oneof=owner admin member"`
}

// handleUpdateMemberRole changes a member's role (owner only).
func handleUpdateMemberRole(wsRepo *repository.WorkspaceRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		userID, _ := middleware.UserID(c)
		role, _ := wsRepo.GetMemberRole(ws.ID, userID)
		if role != "owner" {
			response.Error(c, http.StatusForbidden, "forbidden", "Only workspace owner can change member roles")
			return
		}
		targetID64, err := strconv.ParseUint(c.Param("userId"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid user ID")
			return
		}
		targetID := uint(targetID64)
		if targetID == userID {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Cannot change your own role")
			return
		}
		var req updateMemberRoleBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid request body")
			return
		}
		if err := wsRepo.UpdateMemberRole(ws.ID, targetID, req.Role); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to update member role")
			return
		}
		response.OK(c, gin.H{"message": "Role updated"})
	}
}

// handleRemoveMember removes a member from the workspace (owner/admin only).
func handleRemoveMember(wsRepo *repository.WorkspaceRepository, usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		userID, _ := middleware.UserID(c)
		u, err := usersRepo.GetByID(userID)
		if err != nil || u == nil {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Forbidden")
			return
		}
		// Superadmin bypass: allow maintenance user to remove members across tenants.
		if !u.IsSystemAdmin {
			role, _ := wsRepo.GetMemberRole(ws.ID, userID)
			if role != "owner" && role != "admin" {
				response.Error(c, http.StatusForbidden, "forbidden", "Only owner or admin can remove members")
				return
			}
		}
		targetID64, err := strconv.ParseUint(c.Param("userId"), 10, 64)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid user ID")
			return
		}
		targetID := uint(targetID64)
		if targetID == userID {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Cannot remove yourself")
			return
		}
		targetRole, _ := wsRepo.GetMemberRole(ws.ID, targetID)
		if targetRole == "owner" {
			response.Error(c, http.StatusForbidden, "forbidden", "Cannot remove the workspace owner")
			return
		}
		if err := wsRepo.RemoveMember(ws.ID, targetID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to remove member")
			return
		}
		response.OK(c, gin.H{"message": "Member removed"})
	}
}

// handleLeaveMe removes the current user from the active workspace.
// Owners cannot leave (to avoid orphaned workspaces without an owner).
func handleLeaveMe(wsRepo *repository.WorkspaceRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		userID, _ := middleware.UserID(c)
		role, _ := wsRepo.GetMemberRole(ws.ID, userID)
		if role == "" {
			response.Error(c, http.StatusForbidden, "forbidden", "You are not a workspace member")
			return
		}
		if role == "owner" {
			response.Error(c, http.StatusForbidden, "forbidden", "Workspace owner cannot leave the workspace")
			return
		}
		if err := wsRepo.RemoveMember(ws.ID, userID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to leave workspace")
			return
		}
		response.OK(c, gin.H{"message": "Left workspace"})
	}
}

type updateBrandingBody struct {
	CustomName   string `json:"custom_name"`
	PrimaryColor string `json:"primary_color"`
	Description  string `json:"description"`
}

// handleUpdateBranding updates white-label branding fields (admin/owner only).
func handleUpdateBranding(wsRepo *repository.WorkspaceRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		userID, _ := middleware.UserID(c)
		role, _ := wsRepo.GetMemberRole(ws.ID, userID)
		if role != "owner" && role != "admin" {
			response.Error(c, http.StatusForbidden, "forbidden", "Only admin or owner can update branding")
			return
		}
		var req updateBrandingBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid request body")
			return
		}
		if err := wsRepo.UpdateBranding(ws.ID, req.CustomName, req.PrimaryColor, "", req.Description); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to update branding")
			return
		}
		updated, _ := wsRepo.GetByID(ws.ID)
		response.OK(c, gin.H{"workspace": updated})
	}
}

// handleUploadLogo handles logo file upload (admin/owner only).
func handleUploadLogo(wsRepo *repository.WorkspaceRepository, uploadsDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		userID, _ := middleware.UserID(c)
		role, _ := wsRepo.GetMemberRole(ws.ID, userID)
		if role != "owner" && role != "admin" {
			response.Error(c, http.StatusForbidden, "forbidden", "Only admin or owner can upload logo")
			return
		}
		fh, err := c.FormFile("logo")
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "No logo file provided")
			return
		}
		ext := strings.ToLower(filepath.Ext(fh.Filename))
		if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".svg" && ext != ".webp" {
			response.Error(c, http.StatusBadRequest, "invalid_file_type", "Only PNG, JPG, SVG or WebP logos are accepted")
			return
		}
		filename := fmt.Sprintf("logo_%d_%d%s", ws.ID, time.Now().UnixMilli(), ext)
		dest := filepath.Join(uploadsDir, "logos", filename)
		if err := c.SaveUploadedFile(fh, dest); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to save logo")
			return
		}
		logoURL := "/uploads/logos/" + filename
		if err := wsRepo.UpdateBranding(ws.ID, ws.CustomName, ws.PrimaryColor, logoURL, ws.Description); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to save logo URL")
			return
		}
		updated, _ := wsRepo.GetByID(ws.ID)
		response.OK(c, gin.H{"workspace": updated, "logo_url": logoURL})
	}
}

// handleGetAnalytics returns workspace usage analytics (admin/owner only).
func handleGetAnalytics(wsRepo *repository.WorkspaceRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		userID, _ := middleware.UserID(c)
		role, _ := wsRepo.GetMemberRole(ws.ID, userID)
		if role != "owner" && role != "admin" {
			response.Error(c, http.StatusForbidden, "forbidden", "Only admin or owner can view analytics")
			return
		}
		analytics, err := wsRepo.GetAnalytics(ws.ID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to fetch analytics")
			return
		}
		response.OK(c, gin.H{"analytics": analytics})
	}
}

// handleGetSubscription returns the subscription for the current workspace.
func handleGetSubscription(subRepo *repository.SubscriptionRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		sub, err := subRepo.GetByWorkspace(ws.ID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to fetch subscription")
			return
		}
		response.OK(c, gin.H{"subscription": sub})
	}
}
