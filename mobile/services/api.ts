import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Fallback IP configuration for various emulator/local setups
// Android emulator uses 10.0.2.2, iOS simulator uses localhost
const LOCAL_IP = '192.168.1.219';
const DEFAULT_URL = `http://${LOCAL_IP}:3000/api`;

export const API_URL = DEFAULT_URL;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configure Axios token interceptors
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const orgSlug = await SecureStore.getItemAsync('organization_slug');
    if (orgSlug) {
      config.headers['X-Organization-Slug'] = orgSlug;
    }
  } catch (err) {
    console.error('Error loading request interceptor headers:', err);
  }
  return config;
});

export const authService = {
  async saveSession(token: string, user: any, orgSlug: string): Promise<void> {
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    await SecureStore.setItemAsync('organization_slug', orgSlug);
  },

  async clearSession(): Promise<void> {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('organization_slug');
  },

  async getSessionToken(): Promise<string | null> {
    return SecureStore.getItemAsync('token');
  },

  async getSessionUser(): Promise<any | null> {
    const userStr = await SecureStore.getItemAsync('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  async getActiveOrgSlug(): Promise<string | null> {
    return SecureStore.getItemAsync('organization_slug');
  },

  async login(credentials: { email: string; password_hash?: string; password?: string }): Promise<any> {
    const response = await api.post('/auth/login', {
      email: credentials.email,
      password: credentials.password || credentials.password_hash,
    });
    return response.data;
  },
};
