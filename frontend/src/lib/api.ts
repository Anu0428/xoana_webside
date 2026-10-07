import axios, { isAxiosError } from 'axios';
import { useStore, type User } from '@/store';
import type { ApiResponse, Page, Product, Article, Order, AdminUser, ContactMessage, TrafficStats } from '@/types/models';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined' && !config.url?.startsWith('/api/auth/')) {
    const token = useStore.getState().token;
    if (token && !config.headers.has('Authorization')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
      // Authentication form errors belong to the form; 403 must not log users out.
      if (error.response?.status === 401 && typeof window !== 'undefined'
          && !error.config?.url?.startsWith('/api/auth/')) {
        const { token, clearAuth } = useStore.getState();
        const authorization = error.config?.headers?.Authorization;
        // A late response for a previous token must not clear a newer login.
        if (authorization === (token ? `Bearer ${token}` : undefined)) {
          clearAuth();
          if (window.location.pathname !== '/login') {
            window.location.replace('/login');
          }
        }
      }
      return Promise.reject(error);
    }
);

export default api;

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const message = isAxiosError<{ message?: unknown }>(error) ? error.response?.data?.message : undefined;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

// API endpoints
export const authApi = {
  login: (data: { username: string; password: string }) => api.post<ApiResponse<User & { token: string }>>('/api/auth/login', data),
  register: (data: { username: string; email: string; password: string; nickname?: string }) =>
      api.post<ApiResponse<User & { token: string }>>('/api/auth/register', data),
};

export const adminApi = {
  getSession: (token: string, signal?: AbortSignal) =>
      api.get<{ success: boolean; data: User }>('/api/admin/session', {
        headers: { Authorization: `Bearer ${token}` },
        signal,
        timeout: 10000,
      }),
};

export const productApi = {
  getAll: (params?: { page?: number; size?: number; category?: string; keyword?: string }) =>
      api.get<ApiResponse<Page<Product>>>('/api/products', { params }),
  getAllForAdmin: (params?: { page?: number; size?: number }) =>
      api.get<ApiResponse<Page<Product>>>('/api/products/all', { params }),
  getFeatured: () => api.get<ApiResponse<Product[]>>('/api/products/featured'),
  getById: (id: number) => api.get<ApiResponse<Product>>(`/api/products/${id}`),
  create: (data: unknown) => api.post('/api/products', data),
  update: (id: number, data: unknown) => api.put(`/api/products/${id}`, data),
  delete: (id: number) => api.delete(`/api/products/${id}`),
};

export const articleApi = {
  getAll: (params?: { page?: number; size?: number }) => api.get<ApiResponse<Page<Article>>>('/api/articles', { params }),
  getRecent: () => api.get<ApiResponse<Article[]>>('/api/articles/recent'),
  getById: (id: number) => api.get<ApiResponse<Article>>(`/api/articles/${id}`),
  getAllAdmin: (params?: { page?: number; size?: number }) =>
      api.get<ApiResponse<Page<Article>>>('/api/articles/admin/all', { params }),
  create: (data: unknown) => api.post('/api/articles', data),
  update: (id: number, data: unknown) => api.put(`/api/articles/${id}`, data),
  delete: (id: number) => api.delete(`/api/articles/${id}`),
};

export const orderApi = {
  create: (data: unknown) => api.post('/api/orders', data),
  getMyOrders: (params?: { page?: number; size?: number }) => api.get<ApiResponse<Page<Order>>>('/api/orders/my', { params }),
  getAllAdmin: (params?: { page?: number; size?: number }) =>
      api.get<ApiResponse<Page<Order>>>('/api/orders/admin/all', { params }),
  updateStatus: (id: number, status: string) =>
      api.put(`/api/orders/${id}/status`, null, { params: { status } }),
  processPayment: (id: number, method: string) =>
      api.post(`/api/orders/${id}/pay`, null, { params: { method } }),
};

export const userApi = {
  getProfile: () => api.get<ApiResponse<User>>('/api/users/me'),
  updateProfile: (data: unknown) => api.put<ApiResponse<User>>('/api/users/me', data),
  getAllAdmin: (params?: { page?: number; size?: number }) =>
      api.get<ApiResponse<Page<AdminUser>>>('/api/users/admin/all', { params }),
  toggleStatus: (id: number) => api.put(`/api/users/admin/${id}/status`),
};

export const trafficApi = {
  track: (path: string) => api.post('/api/traffic/track', { path }).catch(() => {}),
  getStats: (days?: number) => api.get<ApiResponse<TrafficStats>>('/api/traffic/stats', { params: { days } }),
};

export const uploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<string>>('/api/admin/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const contactApi = {
  submit: (data: { name: string; email: string; message: string }) =>
      api.post('/api/contact', data),
  getAll: (params?: { page?: number; size?: number }) =>
      api.get<ApiResponse<Page<ContactMessage>>>('/api/contact', { params }),
  markAsRead: (id: number) => api.put(`/api/contact/${id}/read`),
  delete: (id: number) => api.delete(`/api/contact/${id}`),
};

export const settingsApi = {
  get: () => api.get('/api/settings'),
  update: (data: Record<string, unknown>) => api.put('/api/settings', data),
};
