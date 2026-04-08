import api from '../lib/api';

export const scheduledMessageService = {
  schedule: (roomId, { content, scheduledAt, replyToId }) =>
    api.post(`/api/rooms/${roomId}/scheduled-messages`, {
      content,
      scheduled_at: scheduledAt,
      reply_to_id: replyToId ?? null,
    }),

  list: (roomId) =>
    api.get(`/api/rooms/${roomId}/scheduled-messages`),

  cancel: (id) =>
    api.delete(`/api/scheduled-messages/${id}`),
};
