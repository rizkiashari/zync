import api from '../lib/api';
import { API_BASE } from '../lib/api';

export const messageService = {
  list: (roomId, params = {}) =>
    api.get(`/api/rooms/${roomId}/messages`, { params }),

  getById: (msgId) =>
    api.get(`/api/messages/${msgId}`),

  search: (roomId, query) =>
    api.get(`/api/rooms/${roomId}/messages/search`, { params: { q: query } }),

  edit: (msgId, body) =>
    api.put(`/api/messages/${msgId}`, { body }),

  delete: (msgId) =>
    api.delete(`/api/messages/${msgId}`),

  getReactions: (msgId) =>
    api.get(`/api/messages/${msgId}/reactions`),

  addReaction: (msgId, emoji) =>
    api.post(`/api/messages/${msgId}/reactions`, { emoji }),

  removeReaction: (msgId, emoji) =>
    api.delete(`/api/messages/${msgId}/reactions/${encodeURIComponent(emoji)}`),

  uploadFile: (roomId, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/api/rooms/${roomId}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  fileUrl: (url) => `${API_BASE}${url}`,

  listFiles: (roomId, params = {}) =>
    api.get(`/api/rooms/${roomId}/files`, { params }),

  getThread: (msgId, params = {}) =>
    api.get(`/api/messages/${msgId}/thread`, { params }),

  listWorkspaceFiles: (workspaceId, params = {}) =>
    api.get(`/api/workspaces/${workspaceId}/files`, { params }),

  forward: (msgId, roomIds) =>
    api.post(`/api/messages/${msgId}/forward`, { room_ids: roomIds }),

  getLinkPreview: (url) =>
    api.get(`/api/link-preview`, { params: { url } }),
};
