import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import Cookies from 'js-cookie';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyProfile } from './api/user';
import './App.css';

import { Login } from './pages/Login/Login';
import { Profile } from './pages/Profile/Profile';
import { Register } from './pages/Register/Register';
import { VerifyEmail } from './pages/VerifyEmail/VerifyEmail';
import { AdminLayout } from './pages/Admin/AdminLayout';
import { AdminLocations } from './pages/Admin/AdminLocations';
import { AdminHalls } from './pages/Admin/AdminHalls';
import { AdminEvents } from './pages/Admin/AdminEvents';
import { AdminSessions } from './pages/Admin/AdminSessions';
import { EventsPage } from './pages/Events/EventsPage';
import { EventDetailPage } from './pages/Events/EventDetailPage';
import { BookingPage } from './pages/Booking/BookingPage';
import { LanguageProvider } from './i18n';
import { useLanguage } from './hooks/useLanguage';
import { TicketValidator } from './pages/Admin/TicketValidator';
import { AdminAnalytics } from './pages/Admin/AdminAnalytics';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = Cookies.get('accessToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const token = Cookies.get('accessToken');
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['profile'],
    queryFn: getMyProfile,
    enabled: !!token,
  });

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="profile-loading">
        <p>{t('Проверка прав доступа...')}</p>
      </div>
    );
  }

  if (isError || !profile?.roles?.includes('ADMIN')) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}

function PaymentReturnHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const hasStripeSession = searchParams.get('session_id') || searchParams.get('payment_intent');
    const isSuccess = searchParams.get('success');
    const wasPendingPayment = sessionStorage.getItem('pending_stripe_payment');

    if (hasStripeSession || isSuccess || wasPendingPayment) {
      sessionStorage.removeItem('pending_stripe_payment');

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });

      navigate('/profile', { replace: true });
    }
  }, [searchParams, navigate, queryClient]);

  return null;
}

function AppRoutes() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <main className="page-shell" lang={language}>
      <PaymentReturnHandler />

      <Routes>
        {/* Публичная витрина */}
        <Route path="/" element={<EventsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />

        {/* Экран бронирования мест */}
        <Route
          path="/booking/session/:sessionId"
          element={
            <ProtectedRoute>
              <BookingPage />
            </ProtectedRoute>
          }
        />

        {/* Авторизация и регистрация */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Профиль пользователя */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile onLogout={() => navigate('/login')} />
            </ProtectedRoute>
          }
        />

        {/* Прямые пути возврата платежных систем */}
        <Route path="/payment/success" element={<Navigate to="/profile" replace />} />
        <Route path="/payment/cancel" element={<Navigate to="/profile" replace />} />

        {/* Панель администратора */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="analytics" replace />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="locations" element={<AdminLocations />} />
          <Route path="halls" element={<AdminHalls />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="validator" element={<TicketValidator />} />
        </Route>

        {/* 404 / Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </LanguageProvider>
  );
}