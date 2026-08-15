import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  const orgSlug = localStorage.getItem('organization_slug');
  if (orgSlug) config.headers['X-Organization-Slug'] = orgSlug;
  
  return config;
});

export const fixturesApi = {
  getAll: (params) => api.get('/fixtures', { params }),
  getById: (id) => api.get(`/fixtures/${id}`),
  getTeamSchedule: (code) => api.get(`/fixtures/team/${code}/schedule`),
  getDistrictSchedule: (code) => api.get(`/fixtures/district/${code}/schedule`),
  getLineups: (id) => api.get(`/fixtures/${id}/lineups`),
  saveLineup: (id, data) => api.post(`/fixtures/${id}/lineups`, data),
  delete: (id) => api.delete(`/fixtures/${id}`),
};

export const scoresApi = {
  update: (id, data) => api.patch(`/scores/${id}`, data),
};

export const standingsApi = {
  getBySport: (sport) => api.get('/standings', { params: { sport } }),
  getLog: () => api.get('/standings/log'),
};

export const uploadApi = {
  uploadFixtures: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/fixtures', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadLogo: (districtCode, file) => {
    const formData = new FormData();
    formData.append('districtCode', districtCode);
    formData.append('logo', file);
    return api.post('/upload/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  downloadTemplate: () => api.get('/upload/template', { responseType: 'blob' }),
};

export const generateApi = {
  preview: (data) => api.post('/generate', { ...data, saveToDb: false }),
  generateAndSave: (data) => api.post('/generate', { ...data, saveToDb: true }),
};

export const teamsApi = {
  getAll: () => api.get('/teams'),
  getPlayers: (id) => api.get(`/teams/${id}/players`),
  addPlayer: (id, data) => api.post(`/teams/${id}/players`, data),
  deletePlayer: (id, playerId) => api.delete(`/teams/${id}/players/${playerId}`),
};

export const districtsApi = teamsApi;

export const analyticsApi = {
  getStats: (params) => api.get('/analytics', { params }),
};

export const athleticsApi = {
  getSports: () => api.get('/athletics/sports'),
  getEvents: () => api.get('/athletics/events'),
  createEvent: (data) => api.post('/athletics/events', data),
  updateEvent: (id, data) => api.put(`/athletics/events/${id}`, data),
  deleteEvent: (id) => api.delete(`/athletics/events/${id}`),
  saveResults: (id, results) => api.post(`/athletics/events/${id}/results`, { results }),
};

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.post('/settings', data),
  reset: (type) => api.post('/settings/reset', { type }),
  saveSponsors: (sponsors) => api.post('/settings/sponsors', { sponsors }),
};

export const venuesApi = {
  getAll: () => api.get('/venues'),
  create: (data) => api.post('/venues', data),
  delete: (id) => api.delete(`/venues/${id}`),
};

export const sportsApi = {
  getAll: () => api.get('/sports'),
  create: (data) => api.post('/sports', data),
  delete: (id) => api.delete(`/sports/${id}`),
};

export const organizationsApi = {
  getAll: () => api.get('/organizations'),
  create: (data) => api.post('/organizations', data),
};

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  me: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  createUser: (userData) => api.post('/auth/users', userData),
  updateUser: (id, userData) => api.put(`/auth/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
};
