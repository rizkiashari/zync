package tasks

import (
	"github.com/gin-gonic/gin"

	"zync-server/internal/hub"
	"zync-server/internal/repository"
)

func Register(api *gin.RouterGroup, h *hub.Hub, tasksRepo *repository.TaskRepository, roomsRepo *repository.RoomRepository) {
	// Board
	api.GET("/rooms/:id/board", handleGetBoard(h, tasksRepo, roomsRepo))

	// Columns
	api.POST("/boards/:boardId/columns", handleCreateColumn(h, tasksRepo, roomsRepo))
	api.PUT("/columns/:colId", handleUpdateColumn(h, tasksRepo, roomsRepo))
	api.DELETE("/columns/:colId", handleDeleteColumn(h, tasksRepo, roomsRepo))

	// Tasks
	api.POST("/boards/:boardId/tasks", handleCreateTask(h, tasksRepo, roomsRepo))
	api.PUT("/tasks/:taskId", handleUpdateTask(h, tasksRepo, roomsRepo))
	api.DELETE("/tasks/:taskId", handleDeleteTask(h, tasksRepo, roomsRepo))

	// Assignees
	api.POST("/tasks/:taskId/assignees", handleAddAssignee(h, tasksRepo, roomsRepo))
	api.DELETE("/tasks/:taskId/assignees/:userId", handleRemoveAssignee(h, tasksRepo, roomsRepo))
}
