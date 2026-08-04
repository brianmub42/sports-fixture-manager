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
  getDistrictSchedule: (code) => api.get(`/fixtures/district/${code}/schedule`),
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
  downloadTemplate: () => api.get('/upload/template', { responseType: 'blob' }),
};

export const generateApi = {
  preview: (data) => api.post('/generate', { ...data, saveToDb: false }),
  generateAndSave: (data) => api.post('/generate', { ...data, saveToDb: true }),
};

export const districtsApi = {
  getAll: () => api.get('/districts'),
};

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.post('/settings', data),
  reset: (type) => api.post('/settings/reset', { type }),
  saveSponsors: (sponsors) => api.post('/settings/sponsors', { sponsors }),
};

export const organizationsApi = {
  getAll: () => api.get('/organizations'),
  create: (data) => api.post('/organizations', data),
};

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  me: () => api.get('/auth/me'),
};
