package workspaces

import (
	"net/http"
	"regexp"
	"strings"

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
