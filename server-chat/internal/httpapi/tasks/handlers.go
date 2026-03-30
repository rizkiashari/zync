package tasks

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"zync-server/internal/hub"
	"zync-server/internal/httpapi/middleware"
	"zync-server/internal/httpapi/response"
	"zync-server/internal/repository"
)

// ─── request bodies ──────────────────────────────────────────────────────────

type createColumnBody struct {
	Name  string `json:"name"  binding:"required,min=1,max=64"`
	Color string `json:"color" binding:"omitempty,max=32"`
}

type updateColumnBody struct {
	Name  string `json:"name"  binding:"omitempty,min=1,max=64"`
	Color string `json:"color" binding:"omitempty,max=32"`
}

type createTaskBody struct {
	ColumnID    uint    `json:"column_id" binding:"required"`
	Title       string  `json:"title"     binding:"required,min=1,max=256"`
	Description string  `json:"description"`
	Priority    string  `json:"priority"  binding:"omitempty,oneof=low medium high"`
	DeadlineAt  *string `json:"deadline_at"` // RFC3339 or empty
}

type updateTaskBody struct {
	Title       string  `json:"title"       binding:"omitempty,min=1,max=256"`
	Description *string `json:"description"`
	Priority    string  `json:"priority"    binding:"omitempty,oneof=low medium high"`
	DeadlineAt  *string `json:"deadline_at"`
	ColumnID    *uint   `json:"column_id"`
}

type addAssigneeBody struct {
	UserID uint `json:"user_id" binding:"required"`
}

// ─── helpers ─────────────────────────────────────────────────────────────────

func parseBoardID(c *gin.Context) (uint, error) {
	id64, err := strconv.ParseUint(c.Param("boardId"), 10, 64)
	return uint(id64), err
}

func parseColID(c *gin.Context) (uint, error) {
	id64, err := strconv.ParseUint(c.Param("colId"), 10, 64)
	return uint(id64), err
}

func parseTaskID(c *gin.Context) (uint, error) {
	id64, err := strconv.ParseUint(c.Param("taskId"), 10, 64)
	return uint(id64), err
}

func parseAssigneeUserID(c *gin.Context) (uint, error) {
	id64, err := strconv.ParseUint(c.Param("userId"), 10, 64)
	return uint(id64), err
}

func parseRoomID(c *gin.Context) (uint, error) {
	id64, err := strconv.ParseUint(c.Param("id"), 10, 64)
	return uint(id64), err
}

func boardRoomKey(roomID uint) string {
	return strconv.FormatUint(uint64(roomID), 10)
}

func parseDeadline(s *string) (*time.Time, error) {
	if s == nil || *s == "" {
		return nil, nil
	}
	t, err := time.Parse(time.RFC3339, *s)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// boardRoomID fetches the room_id for a board from the repo.
func boardRoomID(tasksRepo *repository.TaskRepository, boardID uint) (uint, bool) {
	board, err := tasksRepo.GetBoardByID(boardID)
	if err != nil || board == nil {
		return 0, false
	}
	return board.RoomID, true
}

// columnRoomID resolves the room_id from a column id via board.
func columnRoomID(tasksRepo *repository.TaskRepository, colID uint) (uint, bool) {
	col, err := tasksRepo.GetColumnByID(colID)
	if err != nil || col == nil {
		return 0, false
	}
	return boardRoomID(tasksRepo, col.BoardID)
}

// taskRoomID resolves the room_id from a task id via board.
func taskRoomID(tasksRepo *repository.TaskRepository, taskID uint) (uint, bool) {
	task, err := tasksRepo.GetTaskWithDetails(taskID)
	if err != nil || task == nil {
		return 0, false
	}
	return boardRoomID(tasksRepo, task.BoardID)
}

// isMember checks that the user is a member of the room.
func isMember(roomsRepo *repository.RoomRepository, roomID, userID uint) bool {
	ok, err := roomsRepo.IsMember(roomID, userID)
	return err == nil && ok
}

// ─── handlers ────────────────────────────────────────────────────────────────

func handleGetBoard(h *hub.Hub, tasksRepo *repository.TaskRepository, roomsRepo *repository.RoomRepository) gin.HandlerFunc {
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
		if !isMember(roomsRepo, roomID, userID) {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Not a member of this room")
			return
		}
		board, err := tasksRepo.GetOrCreateBoard(roomID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		full, err := tasksRepo.GetBoardWithColumns(board.ID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		response.OK(c, full)
	}
}

func handleCreateColumn(h *hub.Hub, tasksRepo *repository.TaskRepository, roomsRepo *repository.RoomRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		boardID, err := parseBoardID(c)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid board ID")
			return
		}
		roomID, ok2 := boardRoomID(tasksRepo, boardID)
		if !ok2 {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Board not found")
			return
		}
		if !isMember(roomsRepo, roomID, userID) {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Not a member of this room")
			return
		}
		var req createColumnBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid body")
			return
		}
		color := req.Color
		if color == "" {
			color = "#6366f1"
		}
		col, err := tasksRepo.CreateColumn(boardID, req.Name, color)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		_ = h.BroadcastToRoom(boardRoomKey(roomID), gin.H{"type": "column_created", "column": col})
		response.Created(c, col)
	}
}

func handleUpdateColumn(h *hub.Hub, tasksRepo *repository.TaskRepository, roomsRepo *repository.RoomRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		colID, err := parseColID(c)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid column ID")
			return
		}
		roomID, ok2 := columnRoomID(tasksRepo, colID)
		if !ok2 {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Column not found")
			return
		}
		if !isMember(roomsRepo, roomID, userID) {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Not a member of this room")
			return
		}
		var req updateColumnBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid body")
			return
		}
		col, err := tasksRepo.UpdateColumn(colID, req.Name, req.Color)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		_ = h.BroadcastToRoom(boardRoomKey(roomID), gin.H{"type": "column_updated", "column": col})
		response.OK(c, col)
	}
}

func handleDeleteColumn(h *hub.Hub, tasksRepo *repository.TaskRepository, roomsRepo *repository.RoomRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		colID, err := parseColID(c)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid column ID")
			return
		}
		col, err2 := tasksRepo.GetColumnByID(colID)
		if err2 != nil || col == nil {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Column not found")
			return
		}
		roomID, ok2 := boardRoomID(tasksRepo, col.BoardID)
		if !ok2 {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Board not found")
			return
		}
		if !isMember(roomsRepo, roomID, userID) {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Not a member of this room")
			return
		}
		if err := tasksRepo.DeleteColumn(colID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		_ = h.BroadcastToRoom(boardRoomKey(roomID), gin.H{"type": "column_deleted", "column_id": colID})
		response.OK(c, gin.H{"message": "Column deleted"})
	}
}

func handleCreateTask(h *hub.Hub, tasksRepo *repository.TaskRepository, roomsRepo *repository.RoomRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		boardID, err := parseBoardID(c)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid board ID")
			return
		}
		roomID, ok2 := boardRoomID(tasksRepo, boardID)
		if !ok2 {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Board not found")
			return
		}
		if !isMember(roomsRepo, roomID, userID) {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Not a member of this room")
			return
		}
		var req createTaskBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid body")
			return
		}
		priority := req.Priority
		if priority == "" {
			priority = "medium"
		}
		deadline, err := parseDeadline(req.DeadlineAt)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid deadline format, use RFC3339")
			return
		}
		task, err := tasksRepo.CreateTask(boardID, req.ColumnID, userID, req.Title, req.Description, priority, deadline)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		_ = h.BroadcastToRoom(boardRoomKey(roomID), gin.H{"type": "task_created", "task": task})
		response.Created(c, task)
	}
}

func handleUpdateTask(h *hub.Hub, tasksRepo *repository.TaskRepository, roomsRepo *repository.RoomRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		taskID, err := parseTaskID(c)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid task ID")
			return
		}
		roomID, ok2 := taskRoomID(tasksRepo, taskID)
		if !ok2 {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Task not found")
			return
		}
		if !isMember(roomsRepo, roomID, userID) {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Not a member of this room")
			return
		}
		var req updateTaskBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid body")
			return
		}
		description := ""
		if req.Description != nil {
			description = *req.Description
		}
		deadline, err := parseDeadline(req.DeadlineAt)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid deadline format, use RFC3339")
			return
		}
		task, err := tasksRepo.UpdateTask(taskID, req.Title, description, req.Priority, deadline, req.ColumnID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		_ = h.BroadcastToRoom(boardRoomKey(roomID), gin.H{"type": "task_updated", "task": task})
		response.OK(c, task)
	}
}

func handleDeleteTask(h *hub.Hub, tasksRepo *repository.TaskRepository, roomsRepo *repository.RoomRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		taskID, err := parseTaskID(c)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid task ID")
			return
		}
		roomID, ok2 := taskRoomID(tasksRepo, taskID)
		if !ok2 {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Task not found")
			return
		}
		if !isMember(roomsRepo, roomID, userID) {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Not a member of this room")
			return
		}
		if err := tasksRepo.DeleteTask(taskID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		_ = h.BroadcastToRoom(boardRoomKey(roomID), gin.H{"type": "task_deleted", "task_id": taskID})
		response.OK(c, gin.H{"message": "Task deleted"})
	}
}

func handleAddAssignee(h *hub.Hub, tasksRepo *repository.TaskRepository, roomsRepo *repository.RoomRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		taskID, err := parseTaskID(c)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid task ID")
			return
		}
		roomID, ok2 := taskRoomID(tasksRepo, taskID)
		if !ok2 {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Task not found")
			return
		}
		if !isMember(roomsRepo, roomID, userID) {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Not a member of this room")
			return
		}
		var req addAssigneeBody
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid body")
			return
		}
		// The assignee must also be a room member
		if !isMember(roomsRepo, roomID, req.UserID) {
			response.Error(c, http.StatusBadRequest, response.CodeNotMember, "Assignee is not a member of this room")
			return
		}
		if err := tasksRepo.AddAssignee(taskID, req.UserID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		task, _ := tasksRepo.GetTaskWithDetails(taskID)
		_ = h.BroadcastToRoom(boardRoomKey(roomID), gin.H{"type": "task_updated", "task": task})
		response.OK(c, task)
	}
}

func handleRemoveAssignee(h *hub.Hub, tasksRepo *repository.TaskRepository, roomsRepo *repository.RoomRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := middleware.UserID(c)
		if !ok {
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized")
			return
		}
		taskID, err := parseTaskID(c)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid task ID")
			return
		}
		targetUserID, err := parseAssigneeUserID(c)
		if err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeInvalidBody, "Invalid user ID")
			return
		}
		roomID, ok2 := taskRoomID(tasksRepo, taskID)
		if !ok2 {
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Task not found")
			return
		}
		if !isMember(roomsRepo, roomID, userID) {
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Not a member of this room")
			return
		}
		if err := tasksRepo.RemoveAssignee(taskID, targetUserID); err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternal, "Unable to complete the request")
			return
		}
		task, _ := tasksRepo.GetTaskWithDetails(taskID)
		_ = h.BroadcastToRoom(boardRoomKey(roomID), gin.H{"type": "task_updated", "task": task})
		response.OK(c, task)
	}
}
