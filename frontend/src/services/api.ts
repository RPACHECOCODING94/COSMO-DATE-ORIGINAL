import axios from 'axios';
import { Platform } from 'react-native';

// Determinar URL del backend
const getBackendUrl = () => {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:8001';
};

const BACKEND_URL = getBackendUrl();

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Retry logic para conexiones inestables
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Si no hay config o ya reintentamos 3 veces, fallar
    if (!config || config._retryCount >= 3) {
      return Promise.reject(error);
    }
    
    // Reintentar en errores de red o timeout
    if (!error.response || error.code === 'ECONNABORTED') {
      config._retryCount = (config._retryCount || 0) + 1;
      
      // Esperar antes de reintentar (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * config._retryCount));
      
      return api(config);
    }
    
    return Promise.reject(error);
  }
);

export default api;
