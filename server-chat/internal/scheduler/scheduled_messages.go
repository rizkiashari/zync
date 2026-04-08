package scheduler

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"zync-server/internal/hub"
	"zync-server/internal/repository"
)

// RunScheduledMessages polls for due scheduled messages every 30 seconds and delivers them.
func RunScheduledMessages(ctx context.Context, schedRepo *repository.ScheduledMessageRepository, msgRepo *repository.MessageRepository, h *hub.Hub, log *slog.Logger) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	// Run once immediately
	deliverDue(schedRepo, msgRepo, h, log)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			deliverDue(schedRepo, msgRepo, h, log)
		}
	}
}

func deliverDue(schedRepo *repository.ScheduledMessageRepository, msgRepo *repository.MessageRepository, h *hub.Hub, log *slog.Logger) {
	rows, err := schedRepo.PollDue()
	if err != nil {
		log.Error("scheduled messages: poll due", "error", err)
		return
	}
	now := time.Now().UTC()
	for _, sm := range rows {
		var msgID uint
		var err error
		if sm.ReplyToID != nil {
			msgID, err = msgRepo.SaveMessageWithReply(sm.RoomID, sm.SenderID, sm.Content, *sm.ReplyToID, now)
		} else {
			msgID, err = msgRepo.SaveMessage(sm.RoomID, sm.SenderID, sm.Content, now)
		}
		if err != nil {
			log.Error("scheduled messages: create message", "id", sm.ID, "error", err)
			_ = schedRepo.MarkFailed(sm.ID)
			continue
		}
		if err := schedRepo.MarkSent(sm.ID, msgID); err != nil {
			log.Error("scheduled messages: mark sent", "id", sm.ID, "error", err)
		}
		// Broadcast to room so connected clients receive it in real time
		msg, _ := msgRepo.GetByID(msgID)
		if msg != nil {
			roomKey := fmt.Sprintf("%d", sm.RoomID)
			_ = h.BroadcastToRoom(roomKey, map[string]any{
				"type":    "new_message",
				"message": msg,
			})
		}
		log.Info("scheduled message delivered", "sched_id", sm.ID, "msg_id", msgID, "room", sm.RoomID)
	}
}
