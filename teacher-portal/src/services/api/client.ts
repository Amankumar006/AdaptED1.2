import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { store } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { addNotification } from '../../store/slices/uiSlice';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.token;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request ID for tracking
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    if (response) {
      const { status, data } = response;
      
      switch (status) {
        case 401:
          // Unauthorized - logout user
          store.dispatch(logout());
          store.dispatch(
            addNotification({
              type: 'error',
              message: 'Session expired. Please login again.',
            })
          );
          break;
        case 403:
          // Forbidden
          store.dispatch(
            addNotification({
              type: 'error',
              message: 'You do not have permission to perform this action.',
            })
          );
          break;
        case 404:
          // Not found
          store.dispatch(
            addNotification({
              type: 'error',
              message: 'The requested resource was not found.',
            })
          );
          break;
        case 422:
          // Validation error
          const validationMessage = data?.message || 'Validation error occurred.';
          store.dispatch(
            addNotification({
              type: 'error',
              message: validationMessage,
            })
          );
          break;
        case 500:
          // Server error
          store.dispatch(
            addNotification({
              type: 'error',
              message: 'An internal server error occurred. Please try again later.',
            })
          );
          break;
        default:
          // Generic error
          const errorMessage = data?.message || 'An unexpected error occurred.';
          store.dispatch(
            addNotification({
              type: 'error',
              message: errorMessage,
            })
          );
      }
    } else if (error.code === 'ECONNABORTED') {
      // Timeout error
      store.dispatch(
        addNotification({
          type: 'error',
          message: 'Request timeout. Please check your connection and try again.',
        })
      );
    } else {
      // Network error
      store.dispatch(
        addNotification({
          type: 'error',
          message: 'Network error. Please check your connection.',
        })
      );
    }
    
    return Promise.reject(error);
  }
);

// Generic API methods
export const apiRequest = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.get(url, config).then((response) => response.data),
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.post(url, data, config).then((response) => response.data),
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.put(url, data, config).then((response) => response.data),
  
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.patch(url, data, config).then((response) => response.data),
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.delete(url, config).then((response) => response.data),
};

export default apiClient;