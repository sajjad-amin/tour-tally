import axios from 'axios';

/**
 * Axios instance pre-configured for Laravel Sanctum SPA authentication.
 *
 * - Base URL is read from the root Laravel .env via VITE_APP_URL
 * - withCredentials: true enables cookie-based Sanctum session auth
 * - X-Requested-With header tells Laravel this is an XHR
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_APP_URL || '',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor — attach Bearer token from localStorage if present.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Response interceptor — handle global 401 (Unauthorized) and 419 (Session Expired / CSRF Mismatch).
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    // Do NOT auto-logout / redirect on account deletion endpoint so exact response can be debugged
    if (url.includes('/api/user/account')) {
      return Promise.reject(error);
    }

    if (status === 401 || status === 419) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('logged_in');
      try {
        window.dispatchEvent(new CustomEvent('auth:session_expired'));
      } catch {
        // ignore in non-browser environments
      }

      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
      if (!publicPaths.some((p) => window.location.pathname.startsWith(p))) {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

// Sanctum CSRF cookie endpoint
export const getCsrfCookie = () => api.get('/sanctum/csrf-cookie');

// Auth endpoints
export const authApi = {
  login: (credentials) => api.post('/api/login', credentials),
  register: (data) => api.post('/api/register', data),
  logout: () => api.post('/api/logout'),
  user: () => api.get('/api/user'),
  forgotPassword: (data) => api.post('/api/forgot-password', data),
  resetPassword: (data) => api.post('/api/reset-password', data),
};

// Users management endpoints (Server Admin)
export const usersApi = {
  getAll: (params = {}) => api.get('/api/users', { params }),
  get: (id) => api.get(`/api/users/${id}`),
  create: (data) => api.post('/api/users', data),
  update: (id, data) => api.put(`/api/users/${id}`, data),
  delete: (id, data = {}) => api.delete(`/api/users/${id}`, { data }),
};

// Settings endpoints
export const settingsApi = {
  getPublicSettings: () => api.get('/api/settings/public'),
  getAdminSettings: () => api.get('/api/admin/settings'),
  updateSettings: (data) => api.post('/api/admin/settings', data),
  toggleRegistration: () => api.post('/api/admin/settings/toggle-registration'),
};

// Profile management endpoints
export const profileApi = {
  updateProfile: (data) => api.put('/api/user/profile', data),
  updatePassword: (data) => api.put('/api/user/password', data),
  deleteAccount: (data = {}) => api.delete('/api/user/account', { data }),
};

// Tours & Members endpoints
export const toursApi = {
  getAll: (params = {}) => api.get('/api/tours', { params }),
  get: (id) => api.get(`/api/tours/${id}`),
  create: (data) => api.post('/api/tours', data),
  update: (id, data) => api.put(`/api/tours/${id}`, data),
  delete: (id) => api.delete(`/api/tours/${id}`),
  searchMember: (tourId, email) => api.post(`/api/tours/${tourId}/members/search`, { email }),
  inviteMember: (tourId, data) => api.post(`/api/tours/${tourId}/members/invite`, data),
  acceptInvite: (tourId) => api.post(`/api/tours/${tourId}/members/accept`),
  rejectInvite: (tourId) => api.post(`/api/tours/${tourId}/members/reject`),
  removeMember: (tourId, memberId) => api.delete(`/api/tours/${tourId}/members/${memberId}`),
};

// Notifications endpoints
export const notificationsApi = {
  getAll: (params = {}) => api.get('/api/notifications', { params }),
  getUnread: (limit = 10) => api.get('/api/notifications/unread', { params: { limit } }),
  markAsRead: (id) => api.put(`/api/notifications/${id}/read`),
  markAllAsRead: () => api.put('/api/notifications/read-all'),
  clearAll: () => api.delete('/api/notifications/clear-all'),
};

// Expense Tracking endpoints
export const expenseApi = {
  getAll: (tourId) => api.get(`/api/tours/${tourId}/expenses`),
  get: (tourId, expenseId) => api.get(`/api/tours/${tourId}/expenses/${expenseId}`),
  create: (tourId, data) => api.post(`/api/tours/${tourId}/expenses`, data),
  update: (tourId, expenseId, data) => api.put(`/api/tours/${tourId}/expenses/${expenseId}`, data),
  approve: (tourId, expenseId) => api.put(`/api/tours/${tourId}/expenses/${expenseId}/approve`),
  reject: (tourId, expenseId) => api.put(`/api/tours/${tourId}/expenses/${expenseId}/reject`),
  requestEdit: (tourId, expenseId) => api.put(`/api/tours/${tourId}/expenses/${expenseId}/request-edit`),
  requestDelete: (tourId, expenseId) => api.delete(`/api/tours/${tourId}/expenses/${expenseId}`),
};

export const expensesApi = expenseApi;

// Split Settlement endpoints
export const settlementApi = {
  get: (tourId) => api.get(`/api/tours/${tourId}/settlements`),
};

export const settlementsApi = settlementApi;

// Export & PDF Generation endpoints
export const exportApi = {
  getText: (tourId) => api.get(`/api/tours/${tourId}/export/text`),
  downloadPdf: (tourId) =>
    api.get(`/api/tours/${tourId}/export/pdf?download=1`, { responseType: 'blob' }),
  openPdf: (tourId) =>
    api.get(`/api/tours/${tourId}/export/pdf`, { responseType: 'blob' }),
  getPosReceipt: (tourId, memberId, download = false) =>
    api.get(`/api/tours/${tourId}/export/pos/${memberId}${download ? '?download=1' : ''}`, {
      responseType: 'blob',
    }),
  printPosReceipt: (tourId, memberId, options = {}) =>
    api.post(`/api/tours/${tourId}/export/pos/${memberId}/print`, options),
  getPrinterStatus: () => api.get('/api/tours/thermal-printer/status'),
  stopPrintJob: (data = {}) => api.post('/api/tours/thermal-printer/stop', data),
};

// Dashboard endpoints
export const dashboardApi = {
  getSummary: () => api.get('/api/dashboard'),
};

export const notificationApi = notificationsApi;

export default api;


