import api from '../lib/api';

export const workspaceService = {
  create:             (name, slug)  => api.post('/api/workspaces', { name, slug }),
  listMine:           ()            => api.get('/api/workspaces/me'),
  getCurrent:         ()            => api.get('/api/workspaces/current'),
  join:               (token)       => api.post(`/api/workspaces/join/${token}`),
  getInvite:          ()            => api.get('/api/workspaces/invite'),
  regenerateInvite:   ()            => api.post('/api/workspaces/invite/regenerate'),
};
