package scheduler

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"zync-server/internal/hub"
	"zync-server/internal/models"
	"zync-server/internal/repository"
)

// RunTaskReminders checks for tasks due within 24h every hour and notifies assignees.
func RunTaskReminders(ctx context.Context, taskRepo *repository.TaskRepository, notifRepo *repository.NotificationRepository, h *hub.Hub, log *slog.Logger) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	// Run once immediately at startup
	runOnce(taskRepo, notifRepo, h, log)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			runOnce(taskRepo, notifRepo, h, log)
		}
	}
}

func runOnce(taskRepo *repository.TaskRepository, notifRepo *repository.NotificationRepository, h *hub.Hub, log *slog.Logger) {
	tasks, err := taskRepo.GetDueSoon(24 * time.Hour)
	if err != nil {
		log.Error("task reminders: query", "error", err)
		return
	}
	now := time.Now().UTC()
	for _, t := range tasks {
		if len(t.AssigneeIDs) == 0 {
			continue
		}
		body := fmt.Sprintf("Task \"%s\" jatuh tempo dalam 24 jam", t.Title)
		for _, uid := range t.AssigneeIDs {
			if err := notifRepo.Create(uid, models.NotificationTypeDeadline, t.RoomID, 0, 0, body); err != nil {
				log.Error("task reminders: create notif", "user", uid, "error", err)
				continue
			}
			_ = h.NotifyUser(uid, map[string]any{
				"type":        "task_reminder",
				"task_id":     t.ID,
				"title":       t.Title,
				"deadline_at": t.DeadlineAt,
				"room_id":     t.RoomID,
				"body":        body,
			})
		}
		if err := taskRepo.MarkReminderSent(t.ID, now); err != nil {
			log.Error("task reminders: mark sent", "task", t.ID, "error", err)
		}
	}
}
