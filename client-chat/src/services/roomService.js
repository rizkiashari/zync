import api from '../lib/api';

export const roomService = {
  // Dashboard: rooms with preview + stats + online users
  getDashboard: () =>
    api.get('/api/dashboard'),

  // List all rooms user belongs to
  list: () =>
    api.get('/api/rooms'),

  getById: (roomId) =>
    api.get(`/api/rooms/${roomId}`),

  // Create or get existing direct room with another user
  createDirect: (userId) =>
    api.post('/api/rooms/direct', { user_id: userId }),

  // Create a group room
  createGroup: (name, description, memberIds) =>
    api.post('/api/rooms/group', { name, description, member_ids: memberIds }),

  update: (roomId, name, description) =>
    api.put(`/api/rooms/${roomId}`, { name, description }),

  pinMessage: (roomId, messageId) =>
    api.put(`/api/rooms/${roomId}/pin`, { message_id: messageId }),

  addMember: (roomId, userId) =>
    api.post(`/api/rooms/${roomId}/members`, { user_id: userId }),

  removeMember: (roomId, userId) =>
    api.delete(`/api/rooms/${roomId}/members/${userId}`),

  changeMemberRole: (roomId, userId, role) =>
    api.put(`/api/rooms/${roomId}/members/${userId}/role`, { role }),

  leave: (roomId) =>
    api.delete(`/api/rooms/${roomId}/leave`),

  generateInvite: (roomId) =>
    api.post(`/api/rooms/${roomId}/invite`),

  deleteRoom: (roomId) =>
    api.delete(`/api/rooms/${roomId}`),

  markRead: (roomId) =>
    api.put(`/api/rooms/${roomId}/read`),

  joinByInvite: (token) =>
    api.post(`/api/invite/${token}`),

  getMembers: (roomId) =>
    api.get(`/api/rooms/${roomId}`),
};
