import api from '../lib/api';

export const adminService = {
  listUsers: (search) =>
    api.get('/api/admin/users', {
      params: search ? { search: search.trim() } : {},
    }),

  updateUser: (id, body) => api.put(`/api/admin/users/${id}`, body),
};
