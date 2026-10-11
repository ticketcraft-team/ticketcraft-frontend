import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

// 1. Создаем базовый клиент
export const apiClient = axios.create({
  // Если переменная не задана или в dev-режиме — используем относительный путь ''
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
});
// Переменные для блокировки и очереди запросов
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 2. ПЕРЕХВАТЧИК ЗАПРОСОВ: подставляем токен из Cookies
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. ПЕРЕХВАТЧИК ОТВЕТОВ: ловим 401 и обновляем токен через Cookies
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post('/api/v1/auth/refresh', {}, {
          baseURL: apiClient.defaults.baseURL,
          withCredentials: true,
        });

        const newAccessToken = response.data?.accessToken || response.data?.access_token; 
        
        if (newAccessToken) {
          Cookies.set('accessToken', newAccessToken, { 
            expires: 1, 
            sameSite: 'strict' 
          });
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        } else {
          throw new Error('Новый токен не получен');
        }
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        Cookies.remove('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);