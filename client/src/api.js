import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  const orgSlug = localStorage.getItem('organization_slug');
  if (orgSlug) config.headers['X-Organization-Slug'] = orgSlug;
  
  // Inject x-bypass-billing header if bypass flag is active
  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('bypassBilling') === 'true') {
      sessionStorage.setItem('bypass_billing', 'true');
    }
    
    if (sessionStorage.getItem('bypass_billing') === 'true') {
      config.headers['X-Bypass-Billing'] = 'true';
    }
  }
  
  return config;
});

export const publicApi = {
  getEventInfo: (slug) => api.get(`/public/events/${slug}`),
  getFixtures: (slug, params) => api.get(`/public/events/${slug}/fixtures`, { params }),
  getStandings: (slug, params) => api.get(`/public/events/${slug}/standings`, { params }),
  getLatestResult: (slug) => api.get(`/public/events/${slug}/latest-result`),
  getFeed: (slug) => api.get(`/public/events/${slug}/feed`),
  reactFeed: (slug, postId, reaction) => api.post(`/public/events/${slug}/feed/${postId}/react`, { reaction }),
  shareFeed: (slug, postId) => api.post(`/public/events/${slug}/feed/${postId}/share`),
  getVapidPublicKey: () => api.get('/public/push/vapid-public-key'),
  subscribePush: (data) => api.post('/public/push/subscribe', data),
  unsubscribePush: (data) => api.post('/public/push/unsubscribe', data),
  getPushStatus: (params) => api.get('/public/push/status', { params }),
};

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
  getLogs: () => api.get('/scores/logs'),
};

export const standingsApi = {
  getBySport: (sport, eventId) => api.get('/standings', { params: { sport, eventId } }),
  getLog: () => api.get('/standings/log'),
  getEvents: (sport) => api.get('/standings/events', { params: { sport } }),
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
  downloadTemplate: (type = 'fixtures') => api.get('/upload/template', { params: { type }, responseType: 'blob' }),
  downloadPlacementTemplate: () => api.get('/upload/template/placement', { responseType: 'blob' }),
  uploadPop: (file) => {
    const formData = new FormData();
    formData.append('pop', file);
    return api.post('/upload/pop', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadSponsorLogo: (file) => {
    const formData = new FormData();
    formData.append('sponsorLogo', file);
    return api.post('/upload/sponsor-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadAdvertBanner: (file) => {
    const formData = new FormData();
    formData.append('banner', file);
    return api.post('/upload/advert-banner', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadFeedMedia: (file) => {
    const formData = new FormData();
    formData.append('media', file);
    return api.post('/upload/feed-media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

export const generateApi = {
  preview: (data) => api.post('/generate', { ...data, saveToDb: false }),
  generateAndSave: (data) => api.post('/generate', { ...data, saveToDb: true }),
  saveCustom: (data) => api.post('/generate', { ...data, saveCustom: true }),
  previewMultiSport: (data) => api.post('/generate/multi-sport', { ...data, saveToDb: false }),
  generateAndSaveMultiSport: (data) => api.post('/generate/multi-sport', { ...data, saveToDb: true }),
};

export const teamsApi = {
  getAll: () => api.get('/teams'),
  create: (data) => api.post('/teams', data),
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
  getLatestResult: () => api.get('/athletics/latest-result'),
};

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.post('/settings', data),
  reset: (type) => api.post('/settings/reset', { type }),
  saveSponsors: (sponsors) => api.post('/settings/sponsors', { sponsors }),
  requestInvoice: (schoolName, billingAddress, contactPerson, contactNumber) => api.post('/settings/billing/request-invoice', { schoolName, billingAddress, contactPerson, contactNumber }),
  simulateExpiry: () => api.post('/settings/billing/simulate-expiry'),
  simulateRenewal: () => api.post('/settings/billing/simulate-renewal'),
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
  getMyTournaments: () => api.get('/organizations/my-tournaments'),
  getQuota: () => api.get('/organizations/current/quota'),
  create: (data) => api.post('/organizations', data),
  createTournament: (data) => api.post('/organizations/create-tournament', data),
};

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  switchTournament: (slug) => api.post('/auth/switch-tournament', { slug }),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  verifyResetCode: (data) => api.post('/auth/verify-reset-code', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  me: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  createUser: (userData) => api.post('/auth/users', userData),
  updateUser: (id, userData) => api.put(`/auth/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
};

export const superadminApi = {
  // Workspace / Tenant Management
  getTenants: () => api.get('/superadmin/tenants'),
  createTenant: (data) => api.post('/superadmin/tenants', data),
  updateTenant: (id, data) => api.put(`/superadmin/tenants/${id}`, data),
  getTenantStats: (id) => api.get(`/superadmin/tenants/${id}/stats`),
  impersonateTenant: (id) => api.post(`/superadmin/tenants/${id}/impersonate`),
  approveTenant: (id, days) => api.post(`/superadmin/tenants/${id}/approve`, { days }),
  suspendTenant: (id) => api.post(`/superadmin/tenants/${id}/suspend`),
  extendTenant: (id, expiresAt) => api.post(`/superadmin/tenants/${id}/extend`, { expiresAt }),
  deactivateTenant: (id) => api.post(`/superadmin/tenants/${id}/deactivate`),
  activateTenant: (id) => api.post(`/superadmin/tenants/${id}/activate`),
  deleteTenant: (id) => api.delete(`/superadmin/tenants/${id}`),
  runBillingCheck: () => api.post('/superadmin/billing/run-reminder-check'),

  // Global Users Management
  getUsers: (params) => api.get('/superadmin/users', { params }),
  createUser: (userData) => api.post('/superadmin/users', userData),
  updateUser: (id, userData) => api.put(`/superadmin/users/${id}`, userData),
  resetUserPassword: (id, new_password) => api.post(`/superadmin/users/${id}/reset-password`, { new_password }),
  getUserWorkspaces: (id) => api.get(`/superadmin/users/${id}/workspaces`),
  setUserWorkspaces: (id, data) => api.post(`/superadmin/users/${id}/workspaces`, data),
  deleteUser: (id) => api.delete(`/superadmin/users/${id}`),

  // Platform Parameters & Settings
  getSettings: () => api.get('/superadmin/settings'),
  updateSettings: (settings) => api.put('/superadmin/settings', { settings }),

  // Audit Logs & System Health
  getAuditLogs: (params) => api.get('/superadmin/audit-logs', { params }),
  getSystemHealth: () => api.get('/superadmin/system/health'),
};

export const mediaApi = {
  getAdverts: (activeOnly = false) => api.get('/media/adverts', { params: { activeOnly } }),
  createAdvert: (data) => api.post('/media/adverts', data),
  updateAdvert: (id, data) => api.put(`/media/adverts/${id}`, data),
  deleteAdvert: (id) => api.delete(`/media/adverts/${id}`),

  getAnnouncements: (activeOnly = false) => api.get('/media/announcements', { params: { activeOnly } }),
  createAnnouncement: (data) => api.post('/media/announcements', data),
  deleteAnnouncement: (id) => api.delete(`/media/announcements/${id}`),

  setLayoutOverride: (mode) => api.post('/media/tv-layout-override', { mode }),
  forceCompleteFixture: (id) => api.post(`/media/force-complete-fixture/${id}`),

  getFeed: () => api.get('/media/feed'),
  createFeedPost: (data) => api.post('/media/feed', data),
  deleteFeedPost: (id) => api.delete(`/media/feed/${id}`),
};

