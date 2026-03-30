package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/response"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

const ctxWorkspaceID = "workspaceID"
const ctxWorkspace = "workspace"

// Tenant resolves the workspace from X-Workspace-Slug header and validates membership.
// Must run after Bearer middleware so authUserID is already set in context.
func Tenant(workspaces *repository.WorkspaceRepository, users *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := c.GetHeader("X-Workspace-Slug")
		if slug == "" {
			response.Abort(c, http.StatusBadRequest, "missing_workspace", "X-Workspace-Slug header is required")
			return
		}
		ws, err := workspaces.GetBySlug(slug)
		if err != nil {
			response.Abort(c, http.StatusInternalServerError, response.CodeInternal, "Unable to resolve workspace")
			return
		}
		if ws == nil {
			response.Abort(c, http.StatusNotFound, "workspace_not_found", "Workspace not found")
			return
		}
		userID, ok := UserID(c)
		if ok {
			// System admin can access any workspace.
			u, err := users.GetByID(userID)
			if err != nil || u == nil {
				response.Abort(c, http.StatusForbidden, response.CodeForbidden, "Forbidden")
				return
			}
			if !u.IsSystemAdmin {
				member, _ := workspaces.IsMember(ws.ID, userID)
				if !member {
					response.Abort(c, http.StatusForbidden, "not_workspace_member", "You are not a member of this workspace")
					return
				}
			}
		}
		c.Set(ctxWorkspaceID, ws.ID)
		c.Set(ctxWorkspace, ws)
		c.Next()
	}
}

// WorkspaceID returns the resolved workspace ID from context.
func WorkspaceID(c *gin.Context) (uint, bool) {
	v, ok := c.Get(ctxWorkspaceID)
	if !ok {
		return 0, false
	}
	id, ok := v.(uint)
	return id, ok
}

// GetWorkspace returns the full Workspace object from context.
func GetWorkspace(c *gin.Context) (*models.Workspace, bool) {
	v, ok := c.Get(ctxWorkspace)
	if !ok {
		return nil, false
	}
	ws, ok := v.(*models.Workspace)
	return ws, ok
}
