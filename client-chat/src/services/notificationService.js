import api from '../lib/api';

export const notificationService = {
  list: (limit = 50) =>
    api.get('/api/notifications', { params: { limit } }),

  markAllRead: () =>
    api.put('/api/notifications/read'),

  markRead: (id) =>
    api.put(`/api/notifications/${id}/read`),
};
