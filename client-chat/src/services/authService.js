import axios from 'axios';
import api, { API_BASE } from '../lib/api';

export const authService = {
  register: (email, password, username) =>
    api.post('/auth/register', { email, password, username }),

  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  refresh: (refreshToken) =>
    axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refreshToken }),

  logout: (refreshToken) =>
    api.post('/auth/logout', refreshToken ? { refresh_token: refreshToken } : {}),
};
