import api from '../lib/api';

export const bookmarkService = {
  list: () =>
    api.get('/api/bookmarks'),

  add: (msgId) =>
    api.post(`/api/messages/${msgId}/bookmark`),

  remove: (msgId) =>
    api.delete(`/api/messages/${msgId}/bookmark`),
};
