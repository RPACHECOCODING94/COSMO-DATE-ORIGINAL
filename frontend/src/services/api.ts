import axios from 'axios';
import { Platform } from 'react-native';

// Determinar URL del backend
const getBackendUrl = () => {
  // En producción/preview usar la variable de entorno
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  // Fallback para desarrollo web
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:8001';
};

const BACKEND_URL = getBackendUrl();

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.log('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.log('Network Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
