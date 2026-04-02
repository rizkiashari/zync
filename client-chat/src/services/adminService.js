import api from '../lib/api';

export const adminService = {
  listUsers: (search) =>
    api.get('/api/admin/users', {
      params: search ? { search: search.trim() } : {},
    }),

  updateUser: (id, body) => api.put(`/api/admin/users/${id}`, body),

  listPaymentTransactions: (params) =>
    api.get('/api/admin/payment-transactions', { params }),

  approvePaymentTransaction: (id) =>
    api.put(`/api/admin/payment-transactions/${id}/approve`),

  rejectPaymentTransaction: (id, note) =>
    api.put(`/api/admin/payment-transactions/${id}/reject`, { note: note || '' }),
};
