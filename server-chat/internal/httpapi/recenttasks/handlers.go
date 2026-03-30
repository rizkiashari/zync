package recenttasks

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/repository"
)

type upsertBody struct {
	TaskID uint `json:"task_id" binding:"required"`
}

type reorderBody struct {
	TaskIDs []uint `json:"task_ids" binding:"required"`
}

func list(recentRepo *repository.RecentTaskRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		workspaceID, ok := middleware.WorkspaceID(c)
		if !ok {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Missing workspace context")
			return
		}

		items, err := recentRepo.List(userID, workspaceID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, items)
	}
}

func upsert(recentRepo *repository.RecentTaskRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		workspaceID, ok := middleware.WorkspaceID(c)
		if !ok {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Missing workspace context")
			return
		}

		var body upsertBody
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid request body")
			return
		}

		if err := recentRepo.Upsert(userID, workspaceID, body.TaskID); err != nil {
			// validateTaskInWorkspaceAndRoom returns ErrRecordNotFound on unauthorized task access.
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "You are not allowed to access this task")
			return
		}

		response.OK(c, gin.H{"message": "saved"})
	}
}

func reorder(recentRepo *repository.RecentTaskRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		workspaceID, ok := middleware.WorkspaceID(c)
		if !ok {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Missing workspace context")
			return
		}

		var body reorderBody
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid request body")
			return
		}

		if err := recentRepo.Reorder(userID, workspaceID, body.TaskIDs); err != nil {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Unable to reorder tasks")
			return
		}

		response.OK(c, gin.H{"message": "reordered"})
	}
}

