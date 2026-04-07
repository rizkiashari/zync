import api from '../lib/api';

export const stickerService = {
  getCatalog: () =>
    api.get('/api/stickers/catalog'),

  getOwned: () =>
    api.get('/api/stickers/owned'),

  purchase: (packId) =>
    api.post('/api/stickers/purchase', { pack_id: packId }),
};
