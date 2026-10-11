import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

// Создаем экземпляр клиента
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // количество повторных попыток при ошибке
      refetchOnWindowFocus: false, // не делать запрос при возвращении на вкладку
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);