// src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('edts_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401 (Except for the login endpoint itself)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if the failed request was trying to log in
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    // Only redirect if it's a 401 unauthorized error AND it wasn't a login attempt
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('edts_token');
      localStorage.removeItem('edts_user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;