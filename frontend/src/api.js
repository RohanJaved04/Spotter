import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('spotter_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('spotter_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/token/refresh/', { refresh: refreshToken });
          if (res.data?.access) {
            localStorage.setItem('spotter_access_token', res.data.access);
            originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
            return api(originalRequest);
          }
        } catch {
          localStorage.removeItem('spotter_access_token');
          localStorage.removeItem('spotter_refresh_token');
          localStorage.removeItem('spotter_user');
        }
      }
    }
    return Promise.reject(error);
  }
);

export const geocodeQuery = async (q) => {
  const res = await api.get('/geocode/', { params: { q } });
  return res.data?.results || [];
};

export const planRoutes = async (payload) => {
  const res = await api.post('/routes/plan/', payload);
  return res.data;
};

export const loginUser = async (username, password) => {
  const res = await api.post('/auth/login/', { username, password });
  return res.data;
};

export const registerUser = async (userData) => {
  const res = await api.post('/auth/register/', userData);
  return res.data;
};

export const demoLogin = async () => {
  const res = await api.post('/auth/demo/');
  return res.data;
};

export const getUserProfile = async () => {
  const res = await api.get('/auth/profile/');
  return res.data;
};

export const getSearchHistory = async () => {
  const res = await api.get('/routes/history/');
  return res.data?.history || [];
};

export const getSavedRoutes = async () => {
  const res = await api.get('/routes/saved/');
  return res.data?.saved_routes || [];
};

export const saveRouteBookmark = async (payload) => {
  const res = await api.post('/routes/saved/', payload);
  return res.data;
};

export const deleteSavedRoute = async (id) => {
  const res = await api.delete(`/routes/saved/${id}/`);
  return res.data;
};

export default api;
