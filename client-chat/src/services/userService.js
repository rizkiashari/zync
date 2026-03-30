import api from '../lib/api';

export const userService = {
  list: (search = '') =>
    api.get('/api/users', { params: search ? { search } : {} }),

  getById: (id) =>
    api.get(`/api/users/${id}`),

  block: (userId) =>
    api.post('/api/users/block', { user_id: userId }),

  unblock: (userId) =>
    api.delete(`/api/users/block/${userId}`),

  listBlocked: () =>
    api.get('/api/users/blocked'),
};
