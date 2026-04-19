import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  register: (userData) => {
    return api.post('/auth/register', userData);
  },

  login: (credentials) => {
    return api.post('/auth/login', credentials);
  },

  getProfile: () => {
    return api.get('/auth/profile');
  },

  changePassword: (passwordData) => {
    return api.post('/auth/change-password', passwordData);
  },

  forgotPassword: (data) => {
    return api.post('/auth/forgot-password', data);
  },

  resetPassword: (data) => {
    return api.post('/auth/reset-password', data);
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('devtools_locked');
  },

  isLoggedIn: () => {
    return !!localStorage.getItem('token');
  },

  getToken: () => {
    return localStorage.getItem('token');
  },

  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};

export const userService = {
  getUsers: () => {
    return api.get('/users');
  },

  getRoles: () => {
    return api.get('/users/roles');
  },

  createUser: (userData) => {
    return api.post('/users', userData);
  },

  updateUserStatus: (userId, status) => {
    return api.patch(`/users/${userId}/status`, { status });
  },

  updateUserRole: (userId, roleId) => {
    return api.patch(`/users/${userId}/role`, { roleId });
  },

  resetUserPassword: (userId, newPassword) => {
    return api.patch(`/users/${userId}/password`, { password: newPassword });
  },

  deleteUser: (userId) => {
    return api.delete(`/users/${userId}`);
  }
};

export const orderService = {
  getOrders: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.method) params.append('method', filters.method);
    if (filters.confirmed !== undefined) params.append('confirmed', filters.confirmed);
    if (filters.city) params.append('city', filters.city);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    return api.get(`/orders?${params.toString()}`);
  },

  getOrderById: (orderId) => {
    return api.get(`/orders/${orderId}`);
  },

  createOrder: (orderData) => {
    return api.post('/orders', orderData);
  },

  updateOrder: (orderId, orderData) => {
    return api.patch(`/orders/${orderId}`, orderData);
  },

  updateOrderStatus: (orderId, confirmed) => {
    return api.patch(`/orders/${orderId}/status`, { confirmed });
  },

  deleteOrder: (orderId) => {
    return api.delete(`/orders/${orderId}`);
  },

  bulkImportOrders: (orders) => {
    return api.post('/orders/bulk-import', { orders });
  }
};

export const analyticsService = {
  getSummary: () => {
    return api.get('/api/analytics/summary');
  },

  getTrends: (params = {}) => {
    return api.get('/api/analytics/trends', { params });
  },

  getInsights: (params = {}) => {
    return api.get('/api/analytics/insights', { params });
  },

  compareUsers: (params = {}) => {
    return api.get('/api/analytics/compare', { params });
  }
};

export const geocodingService = {
  search: (query) => {
    return api.get('/api/geocoding/search', {
      params: {
        q: query,
      },
    });
  },
};

export const routingService = {
  trip: (coords) => {
    return api.get('/api/routing/trip', {
      params: {
        coords,
        source: 'first',
        roundtrip: 'false',
      },
    });
  },
};

export default api;
