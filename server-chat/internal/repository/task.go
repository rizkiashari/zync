package repository

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"zync-server/internal/models"
)

type TaskRepository struct {
	db *gorm.DB
}

func NewTaskRepository(db *gorm.DB) *TaskRepository {
	return &TaskRepository{db: db}
}

// AssigneeDetail is a user with their assignment metadata.
type AssigneeDetail struct {
	ID         uint      `json:"id"`
	Username   string    `json:"username"`
	Email      string    `json:"email"`
	Avatar     string    `json:"avatar"`
	AssignedAt time.Time `json:"assigned_at"`
}

// TaskWithDetails is a task enriched with assignee info.
type TaskWithDetails struct {
	models.Task
	Assignees []AssigneeDetail `json:"assignees"`
}

// ColumnWithTasks is a column with all its tasks.
type ColumnWithTasks struct {
	models.TaskColumn
	Tasks []TaskWithDetails `json:"tasks"`
}

// BoardWithColumns is the full board: columns + tasks + assignees.
type BoardWithColumns struct {
	models.TaskBoard
	Columns []ColumnWithTasks `json:"columns"`
}

// GetOrCreateBoard returns (or creates) the kanban board for a group room.
func (r *TaskRepository) GetOrCreateBoard(roomID uint) (*models.TaskBoard, error) {
	var board models.TaskBoard
	err := r.db.Where("room_id = ?", roomID).First(&board).Error
	if err == nil {
		return &board, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	// Create board with default columns
	board = models.TaskBoard{RoomID: roomID}
	if err := r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&board).Error; err != nil {
			return err
		}
		defaults := []struct{ name, color string }{
			{"Todo", "#6366f1"},
			{"In Progress", "#f59e0b"},
			{"On Test", "#8b5cf6"},
			{"Done", "#10b981"},
		}
		for i, d := range defaults {
			col := models.TaskColumn{
				BoardID:  board.ID,
				Name:     d.name,
				Color:    d.color,
				Position: i,
			}
			if err := tx.Create(&col).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return nil, err
	}
	return &board, nil
}

// GetBoardWithColumns returns the full board including columns and tasks.
func (r *TaskRepository) GetBoardWithColumns(boardID uint) (*BoardWithColumns, error) {
	var board models.TaskBoard
	if err := r.db.First(&board, boardID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	var columns []models.TaskColumn
	if err := r.db.Where("board_id = ?", boardID).Order("position ASC").Find(&columns).Error; err != nil {
		return nil, err
	}

	var tasks []models.Task
	if err := r.db.Where("board_id = ?", boardID).Order("position ASC").Find(&tasks).Error; err != nil {
		return nil, err
	}

	// Bulk-fetch assignees for all tasks
	taskIDs := make([]uint, len(tasks))
	for i, t := range tasks {
		taskIDs[i] = t.ID
	}

	type rawAssignee struct {
		TaskID     uint      `gorm:"column:task_id"`
		UserID     uint      `gorm:"column:user_id"`
		AssignedAt time.Time `gorm:"column:assigned_at"`
		Username   string    `gorm:"column:username"`
		Email      string    `gorm:"column:email"`
		Avatar     string    `gorm:"column:avatar"`
	}
	var rawAssignees []rawAssignee
	if len(taskIDs) > 0 {
		r.db.Raw(`
			SELECT ta.task_id, ta.user_id, ta.assigned_at, u.username, u.email, u.avatar
			FROM task_assignees ta
			JOIN users u ON u.id = ta.user_id
			WHERE ta.task_id IN ?`, taskIDs).Scan(&rawAssignees)
	}

	// Index assignees by task
	assigneeMap := make(map[uint][]AssigneeDetail)
	for _, ra := range rawAssignees {
		assigneeMap[ra.TaskID] = append(assigneeMap[ra.TaskID], AssigneeDetail{
			ID:         ra.UserID,
			Username:   ra.Username,
			Email:      ra.Email,
			Avatar:     ra.Avatar,
			AssignedAt: ra.AssignedAt,
		})
	}

	// Build column map
	colMap := make(map[uint]*ColumnWithTasks)
	orderedCols := make([]*ColumnWithTasks, len(columns))
	for i, col := range columns {
		c := &ColumnWithTasks{TaskColumn: col, Tasks: []TaskWithDetails{}}
		colMap[col.ID] = c
		orderedCols[i] = c
	}

	for _, t := range tasks {
		col, ok := colMap[t.ColumnID]
		if !ok {
			continue
		}
		assignees := assigneeMap[t.ID]
		if assignees == nil {
			assignees = []AssigneeDetail{}
		}
		col.Tasks = append(col.Tasks, TaskWithDetails{Task: t, Assignees: assignees})
	}

	result := &BoardWithColumns{TaskBoard: board}
	for _, c := range orderedCols {
		result.Columns = append(result.Columns, *c)
	}
	if result.Columns == nil {
		result.Columns = []ColumnWithTasks{}
	}
	return result, nil
}

// GetBoardByID returns the board model only (without columns).
func (r *TaskRepository) GetBoardByID(boardID uint) (*models.TaskBoard, error) {
	var board models.TaskBoard
	err := r.db.First(&board, boardID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &board, nil
}

// CreateColumn adds a new column to a board.
func (r *TaskRepository) CreateColumn(boardID uint, name, color string) (*models.TaskColumn, error) {
	var maxPos int
	r.db.Model(&models.TaskColumn{}).Where("board_id = ?", boardID).Select("COALESCE(MAX(position), -1)").Scan(&maxPos)
	col := models.TaskColumn{
		BoardID:  boardID,
		Name:     name,
		Color:    color,
		Position: maxPos + 1,
	}
	if err := r.db.Create(&col).Error; err != nil {
		return nil, err
	}
	return &col, nil
}

// UpdateColumn updates name and color of a column.
func (r *TaskRepository) UpdateColumn(colID uint, name, color string) (*models.TaskColumn, error) {
	updates := map[string]any{}
	if name != "" {
		updates["name"] = name
	}
	if color != "" {
		updates["color"] = color
	}
	if err := r.db.Model(&models.TaskColumn{}).Where("id = ?", colID).Updates(updates).Error; err != nil {
		return nil, err
	}
	var col models.TaskColumn
	if err := r.db.First(&col, colID).Error; err != nil {
		return nil, err
	}
	return &col, nil
}

// GetColumnByID returns the column.
func (r *TaskRepository) GetColumnByID(colID uint) (*models.TaskColumn, error) {
	var col models.TaskColumn
	err := r.db.First(&col, colID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &col, nil
}

// DeleteColumn deletes a column and moves its tasks to the first remaining column (or deletes them).
func (r *TaskRepository) DeleteColumn(colID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var col models.TaskColumn
		if err := tx.First(&col, colID).Error; err != nil {
			return err
		}
		// Delete all tasks in this column (cascade assignees)
		var taskIDs []uint
		tx.Model(&models.Task{}).Where("column_id = ?", colID).Pluck("id", &taskIDs)
		if len(taskIDs) > 0 {
			tx.Where("task_id IN ?", taskIDs).Delete(&models.TaskAssignee{})
			tx.Where("column_id = ?", colID).Delete(&models.Task{})
		}
		return tx.Delete(&models.TaskColumn{}, colID).Error
	})
}

// CreateTask creates a new task in the given column.
func (r *TaskRepository) CreateTask(boardID, colID, createdBy uint, title, description, priority string, deadlineAt *time.Time) (*TaskWithDetails, error) {
	var maxPos int
	r.db.Model(&models.Task{}).Where("column_id = ?", colID).Select("COALESCE(MAX(position), -1)").Scan(&maxPos)

	task := models.Task{
		BoardID:     boardID,
		ColumnID:    colID,
		CreatedBy:   createdBy,
		Title:       title,
		Description: description,
		Priority:    priority,
		DeadlineAt:  deadlineAt,
		Position:    maxPos + 1,
	}
	if err := r.db.Create(&task).Error; err != nil {
		return nil, err
	}
	return &TaskWithDetails{Task: task, Assignees: []AssigneeDetail{}}, nil
}

// UpdateTask updates mutable fields of a task.
func (r *TaskRepository) UpdateTask(taskID uint, title, description, priority string, deadlineAt *time.Time, colID *uint) (*TaskWithDetails, error) {
	updates := map[string]any{}
	if title != "" {
		updates["title"] = title
	}
	if description != "" {
		updates["description"] = description
	}
	if priority != "" {
		updates["priority"] = priority
	}
	// Allow clearing deadline: always set if the pointer was explicitly included
	updates["deadline_at"] = deadlineAt
	if colID != nil {
		updates["column_id"] = *colID
	}
	if err := r.db.Model(&models.Task{}).Where("id = ?", taskID).Updates(updates).Error; err != nil {
		return nil, err
	}
	return r.GetTaskWithDetails(taskID)
}

// DeleteTask removes a task and its assignees.
func (r *TaskRepository) DeleteTask(taskID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		tx.Where("task_id = ?", taskID).Delete(&models.TaskAssignee{})
		return tx.Delete(&models.Task{}, taskID).Error
	})
}

// GetTaskWithDetails returns a single task with assignees.
func (r *TaskRepository) GetTaskWithDetails(taskID uint) (*TaskWithDetails, error) {
	var task models.Task
	if err := r.db.First(&task, taskID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	type rawAssignee struct {
		UserID     uint      `gorm:"column:user_id"`
		AssignedAt time.Time `gorm:"column:assigned_at"`
		Username   string    `gorm:"column:username"`
		Email      string    `gorm:"column:email"`
		Avatar     string    `gorm:"column:avatar"`
	}
	var rawList []rawAssignee
	r.db.Raw(`
		SELECT ta.user_id, ta.assigned_at, u.username, u.email, u.avatar
		FROM task_assignees ta
		JOIN users u ON u.id = ta.user_id
		WHERE ta.task_id = ?`, taskID).Scan(&rawList)

	assignees := make([]AssigneeDetail, len(rawList))
	for i, ra := range rawList {
		assignees[i] = AssigneeDetail{
			ID:         ra.UserID,
			Username:   ra.Username,
			Email:      ra.Email,
			Avatar:     ra.Avatar,
			AssignedAt: ra.AssignedAt,
		}
	}
	return &TaskWithDetails{Task: task, Assignees: assignees}, nil
}

// AddAssignee assigns a user to a task (idempotent).
func (r *TaskRepository) AddAssignee(taskID, userID uint) error {
	var n int64
	r.db.Model(&models.TaskAssignee{}).Where("task_id = ? AND user_id = ?", taskID, userID).Count(&n)
	if n > 0 {
		return nil
	}
	return r.db.Create(&models.TaskAssignee{TaskID: taskID, UserID: userID, AssignedAt: time.Now().UTC()}).Error
}

// RemoveAssignee unassigns a user from a task.
func (r *TaskRepository) RemoveAssignee(taskID, userID uint) error {
	return r.db.Where("task_id = ? AND user_id = ?", taskID, userID).Delete(&models.TaskAssignee{}).Error
}
