package repository

import (
	"time"

	"gorm.io/gorm"

	"zync-server/internal/models"
)

type RecentTaskEntry struct {
	ID            uint       `json:"id"` // task id (matches client shape)
	Title         string     `json:"title"`
	Priority      string     `json:"priority"`
	DeadlineAt    *time.Time `json:"deadline_at"`
	GroupID       uint       `json:"groupId"`
	GroupName     string     `json:"groupName"`
	ColumnName    string     `json:"columnName"`
	LastOpenedAt time.Time  `json:"lastOpenedAt"`
}

type RecentTaskRepository struct {
	db *gorm.DB
}

func NewRecentTaskRepository(db *gorm.DB) *RecentTaskRepository {
	return &RecentTaskRepository{db: db}
}

func (r *RecentTaskRepository) maxItems() int {
	return 20
}

// List returns recent tasks for user inside a workspace, ordered by SortIndex.
func (r *RecentTaskRepository) List(userID, workspaceID uint) ([]RecentTaskEntry, error) {
	var entries []RecentTaskEntry

	// Keep sorting in DB; join to task metadata for Dashboard rendering.
	query := `
SELECT
	rt.task_id AS id,
	t.title    AS title,
	t.priority AS priority,
	t.deadline_at AS deadline_at,
	rooms.id   AS "groupId",
	rooms.name AS "groupName",
	COALESCE(cols.name, '') AS "columnName",
	rt.last_opened_at AS lastOpenedAt
FROM recent_tasks rt
JOIN tasks t            ON t.id = rt.task_id
JOIN task_boards b     ON b.id = t.board_id
JOIN task_columns cols ON cols.id = t.column_id
JOIN rooms             ON rooms.id = b.room_id
WHERE rt.user_id = ? AND rt.workspace_id = ?
ORDER BY rt.sort_index ASC
LIMIT 20
`

	if err := r.db.Raw(query, userID, workspaceID).Scan(&entries).Error; err != nil {
		return nil, err
	}
	if entries == nil {
		return []RecentTaskEntry{}, nil
	}
	return entries, nil
}

func (r *RecentTaskRepository) validateTaskInWorkspaceAndRoom(userID, workspaceID, taskID uint) error {
	// Ensure task belongs to workspace AND user is member of the room for this task.
	type row struct {
		ID uint
	}
	var out row
	query := `
SELECT tasks.id AS id
FROM tasks
JOIN task_boards b      ON b.id = tasks.board_id
JOIN rooms              ON rooms.id = b.room_id
JOIN room_members rm   ON rm.room_id = rooms.id AND rm.user_id = ?
WHERE tasks.id = ? AND rooms.workspace_id = ?
LIMIT 1
`
	if err := r.db.Raw(query, userID, taskID, workspaceID).Scan(&out).Error; err != nil {
		return err
	}
	if out.ID == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// Upsert recent task: task becomes the first item, others are shifted and truncated to MAX.
func (r *RecentTaskRepository) Upsert(userID, workspaceID, taskID uint) error {
	// Validate authorization: user must be able to access the task's room in this workspace.
	if err := r.validateTaskInWorkspaceAndRoom(userID, workspaceID, taskID); err != nil {
		return err
	}

	now := time.Now().UTC()
	max := r.maxItems()

	return r.db.Transaction(func(tx *gorm.DB) error {
		// Load current recent ids in order.
		type existingRow struct {
			TaskID       uint
			LastOpenedAt time.Time
		}
		var existing []existingRow
		if err := tx.Table("recent_tasks").
			Select("task_id, last_opened_at").
			Where("user_id = ? AND workspace_id = ?", userID, workspaceID).
			Order("sort_index ASC").
			Limit(max).
			Scan(&existing).Error; err != nil {
			return err
		}

		lastOpenedByTask := make(map[uint]time.Time, len(existing))
		var ordered []uint
		ordered = append(ordered, taskID)
		for _, e := range existing {
			lastOpenedByTask[e.TaskID] = e.LastOpenedAt
			if e.TaskID == taskID {
				continue
			}
			ordered = append(ordered, e.TaskID)
		}
		if len(ordered) > max {
			ordered = ordered[:max]
		}

		// Remove tasks not in the new list.
		if err := tx.Where("user_id = ? AND workspace_id = ? AND task_id NOT IN (?)", userID, workspaceID, ordered).
			Delete(&models.RecentTask{}).Error; err != nil {
			return err
		}

		// Upsert each item with new SortIndex.
		for i, id := range ordered {
			var rt models.RecentTask
			err := tx.Where("user_id = ? AND workspace_id = ? AND task_id = ?", userID, workspaceID, id).
				First(&rt).Error
			if err != nil && err != gorm.ErrRecordNotFound {
				return err
			}

			if err == gorm.ErrRecordNotFound {
				rt = models.RecentTask{
					UserID:       userID,
					WorkspaceID:  workspaceID,
					TaskID:       id,
					LastOpenedAt: func() time.Time { if id == taskID { return now }; return time.Time{} }(),
					SortIndex:    i,
				}
				if id != taskID {
					rt.LastOpenedAt = lastOpenedByTask[id]
				}
				if err := tx.Create(&rt).Error; err != nil {
					return err
				}
				continue
			}

			// Existing record: update sort index; for the newly opened task also update timestamp.
			rt.SortIndex = i
			if id == taskID {
				rt.LastOpenedAt = now
			}
			if err := tx.Save(&rt).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// Reorder updates SortIndex for an ordered list of task ids (length <= MAX).
func (r *RecentTaskRepository) Reorder(userID, workspaceID uint, taskIDs []uint) error {
	if len(taskIDs) == 0 {
		return nil
	}
	taskIDs = uniqueUint(taskIDs)
	max := r.maxItems()
	if len(taskIDs) > max {
		taskIDs = taskIDs[:max]
	}

	// Validate all tasks are in workspace and accessible by user.
	type row struct {
		ID uint
	}
	var rows []row
	query := `
SELECT tasks.id AS id
FROM tasks
JOIN task_boards b    ON b.id = tasks.board_id
JOIN rooms            ON rooms.id = b.room_id
JOIN room_members rm ON rm.room_id = rooms.id AND rm.user_id = ?
WHERE rooms.workspace_id = ?
  AND tasks.id = ANY (?)
`
	// GORM doesn't expand slices automatically for ANY (?) in Raw, so we'll run a simpler IN query.
	query = `
SELECT tasks.id AS id
FROM tasks
JOIN task_boards b    ON b.id = tasks.board_id
JOIN rooms            ON rooms.id = b.room_id
JOIN room_members rm ON rm.room_id = rooms.id AND rm.user_id = ?
WHERE rooms.workspace_id = ?
  AND tasks.id IN (?)
`
	if err := r.db.Raw(query, userID, workspaceID, taskIDs).Scan(&rows).Error; err != nil {
		return err
	}
	if len(rows) != len(taskIDs) {
		return gorm.ErrRecordNotFound
	}

	now := time.Now().UTC()
	// Update sort index to match new order; keep LastOpenedAt unchanged (recency shouldn't change from drag).
	return r.db.Transaction(func(tx *gorm.DB) error {
		for i, id := range taskIDs {
			var rt models.RecentTask
			err := tx.Where("user_id = ? AND workspace_id = ? AND task_id = ?", userID, workspaceID, id).
				First(&rt).Error
			if err != nil && err != gorm.ErrRecordNotFound {
				return err
			}
			if err == gorm.ErrRecordNotFound {
				rt = models.RecentTask{
					UserID:       userID,
					WorkspaceID:  workspaceID,
					TaskID:       id,
					LastOpenedAt: now,
					SortIndex:    i,
				}
				if err := tx.Create(&rt).Error; err != nil {
					return err
				}
				continue
			}

			rt.SortIndex = i
			if err := tx.Save(&rt).Error; err != nil {
				return err
			}
		}

		// Keep only tasks present in the new ordering (optional: ensure list doesn't grow).
		if err := tx.Where("user_id = ? AND workspace_id = ? AND task_id NOT IN (?)", userID, workspaceID, taskIDs).
			Delete(&models.RecentTask{}).Error; err != nil {
			return err
		}
		return nil
	})
}

func uniqueUint(in []uint) []uint {
	seen := make(map[uint]struct{}, len(in))
	out := make([]uint, 0, len(in))
	for _, v := range in {
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		out = append(out, v)
	}
	return out
}

