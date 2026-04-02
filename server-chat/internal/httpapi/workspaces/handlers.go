package workspaces

import (
	"fmt"
	"net/http"
	"net/url"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/hub"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

type createWorkspaceBody struct {
	Name string `json:"name" binding:"required,min=2,max=128"`
	Slug string `json:"slug" binding:"omitempty,min=2,max=64"`
}

var nonAlphaNum = regexp.MustCompile(`[^a-z0-9]+`)

var inviteInStringRe = regexp.MustCompile(`(?i)[?&#]invite=([a-f0-9]+)`)
var inviteHexRe = regexp.MustCompile(`^(?i)[a-f0-9]+$`)

// normalizeInviteToken accepts a bare hex token or a URL / pasted string containing ?invite=…
func normalizeInviteToken(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ""
	}
	if m := inviteInStringRe.FindStringSubmatch(s); len(m) > 1 {
		return strings.ToLower(m[1])
	}
	if u, err := url.Parse(s); err == nil && u.Scheme != "" && u.Host != "" {
		q := strings.TrimSpace(u.Query().Get("invite"))
		if inviteHexRe.MatchString(q) {
			return strings.ToLower(q)
		}
	}
	if !strings.Contains(s, "://") {
		if u, err := url.Parse("https://" + s); err == nil {
			q := strings.TrimSpace(u.Query().Get("invite"))
			if inviteHexRe.MatchString(q) {
				return strings.ToLower(q)
			}
		}
	}
	s = strings.ReplaceAll(s, " ", "")
	if inviteHexRe.MatchString(s) {
		return strings.ToLower(s)
	}
	return ""
}

func joinRawInviteParts(c *gin.Context) string {
	q := strings.TrimSpace(c.Query("invite"))
	if q != "" {
		return q
	}
	return strings.TrimSpace(c.Param("token"))
}

// notifyWorkspaceMembersRefresh tells every current member (notify WS) to refetch the member list.
func notifyWorkspaceMembersRefresh(h *hub.Hub, wsRepo *repository.WorkspaceRepository, workspaceID uint, slug string) {
	if h == nil {
		return
	}
	members, err := wsRepo.ListMembers(workspaceID)
	if err != nil {
		return
	}
	payload := map[string]any{
		"type":           "workspace_members_refresh",
		"workspace_slug": slug,
		"workspace_id":   workspaceID,
	}
	seen := make(map[uint]struct{})
	for _, m := range members {
		if _, ok := seen[m.UserID]; ok {
			continue
		}
		seen[m.UserID] = struct{}{}
		_ = h.NotifyUser(m.UserID, payload)
	}
}

// NotifyWorkspaceSubscriptionRefresh tells every current member to reload workspace / subscription
// context (e.g. after admin approves manual payment or billing changes).
func NotifyWorkspaceSubscriptionRefresh(h *hub.Hub, wsRepo *repository.WorkspaceRepository, workspaceID uint, slug string) {
	if h == nil {
		return
	}
	members, err := wsRepo.ListMembers(workspaceID)
	if err != nil {
		return
	}
	payload := map[string]any{
		"type":           "workspace_subscription_refresh",
		"workspace_slug": slug,
		"workspace_id":   workspaceID,
	}
	seen := make(map[uint]struct{})
	for _, m := range members {
		if _, ok := seen[m.UserID]; ok {
			continue
		}
		seen[m.UserID] = struct{}{}
		_ = h.NotifyUser(m.UserID, payload)
	}
}

func joinWorkspaceForUser(c *gin.Context, wsRepo *repository.WorkspaceRepository, h *hub.Hub, userID uint, raw string) {
	token := normalizeInviteToken(raw)
	if token == "" {
		response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Missing or invalid invite token")
		return
	}
	ws, err := wsRepo.GetByInviteToken(token)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
		return
	}
	if ws == nil {
		response.Error(c, http.StatusNotFound, "invalid_token", "Invalid or expired invite token")
		return
	}
	err = wsRepo.AddMember(ws.ID, userID, "member")
	if err != nil {
		if err.Error() != "already_member" {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to join workspace")
			return
		}
	} else if h != nil {
		notifyWorkspaceMembersRefresh(h, wsRepo, ws.ID, ws.Slug)
	}
	response.OK(c, gin.H{"workspace": ws})
}

type joinWorkspaceBody struct {
	Invite string `json:"invite" binding:"required"`
}

// handleJoinWithBody accepts a JSON body { "invite": "<token or full URL>" } — avoids path parsing 404 when pasting links.
func handleJoinWithBody(wsRepo *repository.WorkspaceRepository, h *hub.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		var body joinWorkspaceBody
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid request body")
			return
		}
		joinWorkspaceForUser(c, wsRepo, h, userID, body.Invite)
	}
}

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

// canWorkspaceAdminOrOwner reports whether the actor may perform owner/admin workspace actions
// (branding, analytics, invite). System (maintenance) admins may act on any workspace.
func canWorkspaceAdminOrOwner(actor *models.User, wsRepo *repository.WorkspaceRepository, wsID uint) bool {
	if actor != nil && actor.IsSystemAdmin {
		return true
	}
	if actor == nil {
		return false
	}
	role, _ := wsRepo.GetMemberRole(wsID, actor.ID)
	return role == models.WorkspaceRoleOwner || role == models.WorkspaceRoleAdmin
}

// canWorkspaceOwner reports whether the actor may perform owner-only actions (e.g. change roles).
// System admins are treated as owner-equivalent for maintenance.
func canWorkspaceOwner(actor *models.User, wsRepo *repository.WorkspaceRepository, wsID uint) bool {
	if actor != nil && actor.IsSystemAdmin {
		return true
	}
	if actor == nil {
		return false
	}
	role, _ := wsRepo.GetMemberRole(wsID, actor.ID)
	return role == models.WorkspaceRoleOwner
}

// handleCreate creates a new workspace owned by the requesting user.
// If X-Workspace-Slug is sent (typical for SPA clients), members of that workspace cannot create another.
func handleCreate(wsRepo *repository.WorkspaceRepository, usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		if slug := c.GetHeader("X-Workspace-Slug"); slug != "" {
			ws, err := wsRepo.GetBySlug(slug)
			if err != nil {
				response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to resolve workspace")
				return
			}
			if ws != nil {
				actor, err := usersRepo.GetByID(userID)
				if err != nil || actor == nil {
					response.Error(c, http.StatusForbidden, response.CodeForbidden, "Forbidden")
					return
				}
				if !actor.IsSystemAdmin {
					role, _ := wsRepo.GetMemberRole(ws.ID, userID)
					if role == models.WorkspaceRoleMember {
						response.Error(c, http.StatusForbidden, "forbidden", "Anggota tidak dapat membuat workspace baru. Gunakan undangan atau hubungi admin.")
						return
					}
				}
			}
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

// handleGetCurrent returns the workspace resolved by the Tenant middleware and the caller's role.
func handleGetCurrent(wsRepo *repository.WorkspaceRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		var myRole string
		if uid, ok := middleware.UserID(c); ok {
			myRole, _ = wsRepo.GetMemberRole(ws.ID, uid)
		}
		response.OK(c, gin.H{"workspace": ws, "my_role": myRole})
	}
}

// handleJoin joins via path /join/:token and optional ?invite= (query wins). Token may be a full pasted URL; it is normalized.
func handleJoin(wsRepo *repository.WorkspaceRepository, h *hub.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		joinWorkspaceForUser(c, wsRepo, h, userID, joinRawInviteParts(c))
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
func handleRegenerateInvite(wsRepo *repository.WorkspaceRepository, usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		userID, _ := middleware.UserID(c)
		actor, err := usersRepo.GetByID(userID)
		if err != nil || actor == nil {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Forbidden")
			return
		}
		if !canWorkspaceAdminOrOwner(actor, wsRepo, ws.ID) {
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

// handleUpdateMemberRole changes a member's role.
// Owner (or system admin): any member except self; may assign admin/member (owner row is protected).
// Workspace admin: may promote member → admin or set member → member only; cannot change owner or other admins.
func handleUpdateMemberRole(wsRepo *repository.WorkspaceRepository, usersRepo *repository.UserRepository, notifRepo *repository.NotificationRepository, h *hub.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		userID, _ := middleware.UserID(c)
		actor, err := usersRepo.GetByID(userID)
		if err != nil || actor == nil {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Forbidden")
			return
		}
		actorRole, _ := wsRepo.GetMemberRole(ws.ID, userID)
		if !actor.IsSystemAdmin && actorRole != models.WorkspaceRoleOwner && actorRole != models.WorkspaceRoleAdmin {
			response.Error(c, http.StatusForbidden, "forbidden", "Only workspace owner or admin can change member roles")
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
		targetRole, _ := wsRepo.GetMemberRole(ws.ID, targetID)
		if targetRole == "" {
			response.Error(c, http.StatusNotFound, "not_found", "User is not a member of this workspace")
			return
		}
		if !actor.IsSystemAdmin && actorRole == models.WorkspaceRoleAdmin {
			if targetRole == models.WorkspaceRoleOwner {
				response.Error(c, http.StatusForbidden, "forbidden", "Admin cannot change the workspace owner")
				return
			}
			if targetRole == models.WorkspaceRoleAdmin {
				response.Error(c, http.StatusForbidden, "forbidden", "Admin cannot change another admin; ask the owner")
				return
			}
			if req.Role == models.WorkspaceRoleOwner {
				response.Error(c, http.StatusForbidden, "forbidden", "Only the owner can assign the owner role")
				return
			}
			if req.Role != models.WorkspaceRoleAdmin && req.Role != models.WorkspaceRoleMember {
				response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid role")
				return
			}
		}
		if targetRole == models.WorkspaceRoleOwner && req.Role != models.WorkspaceRoleOwner {
			response.Error(c, http.StatusForbidden, "forbidden", "Cannot change the workspace owner role here")
			return
		}
		if err := wsRepo.UpdateMemberRole(ws.ID, targetID, req.Role); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to update member role")
			return
		}
		roleLabel := req.Role
		switch req.Role {
		case models.WorkspaceRoleOwner:
			roleLabel = "pemilik"
		case models.WorkspaceRoleAdmin:
			roleLabel = "admin"
		case models.WorkspaceRoleMember:
			roleLabel = "anggota"
		}
		body := fmt.Sprintf("Peranmu di workspace \"%s\" diubah menjadi %s", ws.Name, roleLabel)
		if notifRepo != nil {
			_ = notifRepo.CreateIfNotDND(targetID, models.NotificationTypeSystem, 0, 0, userID, body)
		}
		if h != nil {
			_ = h.NotifyUser(targetID, map[string]any{
				"type":           "notification_refresh",
				"workspace_slug": ws.Slug,
				"role":           req.Role,
				"body":           body,
			})
			notifyWorkspaceMembersRefresh(h, wsRepo, ws.ID, ws.Slug)
		}
		response.OK(c, gin.H{"message": "Role updated"})
	}
}

// handleRemoveMember removes a member from the workspace (owner/admin only).
func handleRemoveMember(wsRepo *repository.WorkspaceRepository, usersRepo *repository.UserRepository, h *hub.Hub) gin.HandlerFunc {
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
		actorRole, _ := wsRepo.GetMemberRole(ws.ID, userID)
		if !u.IsSystemAdmin && actorRole == models.WorkspaceRoleAdmin {
			if targetRole == models.WorkspaceRoleAdmin {
				response.Error(c, http.StatusForbidden, "forbidden", "Admin cannot remove another admin")
				return
			}
		}
		if err := wsRepo.RemoveMember(ws.ID, targetID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to remove member")
			return
		}
		if h != nil {
			_ = h.NotifyUser(targetID, map[string]any{
				"type":           "removed_from_workspace",
				"workspace_slug": ws.Slug,
				"workspace_id":   ws.ID,
			})
			notifyWorkspaceMembersRefresh(h, wsRepo, ws.ID, ws.Slug)
		}
		response.OK(c, gin.H{"message": "Member removed"})
	}
}

// handleDeleteWorkspace permanently deletes the workspace (owner or system admin only).
func handleDeleteWorkspace(wsRepo *repository.WorkspaceRepository, usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		actor, err := usersRepo.GetByID(userID)
		if err != nil || actor == nil {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Forbidden")
			return
		}
		if !actor.IsSystemAdmin && ws.OwnerID != userID {
			response.Error(c, http.StatusForbidden, "forbidden", "Only the workspace owner can delete this workspace")
			return
		}
		if err := wsRepo.DeleteWorkspace(ws.ID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to delete workspace")
			return
		}
		response.OK(c, gin.H{"message": "Workspace deleted"})
	}
}

// handleLeaveMe removes the current user from the active workspace and all rooms in that workspace.
// Owners cannot leave (to avoid orphaned workspaces without an owner).
func handleLeaveMe(wsRepo *repository.WorkspaceRepository, roomsRepo *repository.RoomRepository, h *hub.Hub) gin.HandlerFunc {
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
		if err := wsRepo.LeaveWorkspace(ws.ID, userID, roomsRepo); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to leave workspace")
			return
		}
		if h != nil {
			notifyWorkspaceMembersRefresh(h, wsRepo, ws.ID, ws.Slug)
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
func handleUpdateBranding(wsRepo *repository.WorkspaceRepository, usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		userID, _ := middleware.UserID(c)
		actor, err := usersRepo.GetByID(userID)
		if err != nil || actor == nil {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Forbidden")
			return
		}
		if !canWorkspaceAdminOrOwner(actor, wsRepo, ws.ID) {
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
func handleUploadLogo(wsRepo *repository.WorkspaceRepository, usersRepo *repository.UserRepository, uploadsDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		userID, _ := middleware.UserID(c)
		actor, err := usersRepo.GetByID(userID)
		if err != nil || actor == nil {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Forbidden")
			return
		}
		if !canWorkspaceAdminOrOwner(actor, wsRepo, ws.ID) {
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
func handleGetAnalytics(wsRepo *repository.WorkspaceRepository, usersRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ws, ok := middleware.GetWorkspace(c)
		if !ok {
			response.Error(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		userID, _ := middleware.UserID(c)
		actor, err := usersRepo.GetByID(userID)
		if err != nil || actor == nil {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Forbidden")
			return
		}
		if !canWorkspaceAdminOrOwner(actor, wsRepo, ws.ID) {
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
func handleGetSubscription(subRepo *repository.SubscriptionRepository, usersRepo *repository.UserRepository) gin.HandlerFunc {
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
		userID, ok := middleware.UserID(c)
		if ok {
			if u, _ := usersRepo.GetByID(userID); u != nil && u.IsSystemAdmin {
				sub.Plan = models.PlanEnterprise
				sub.Status = models.SubStatusActive
				sub.ExpiresAt = nil
				sub.MemberLimit = -1
			}
		}
		response.OK(c, gin.H{"subscription": sub})
	}
}
