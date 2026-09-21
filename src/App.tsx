import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import './App.css';
import { Login } from './pages/Login/Login';
import { Profile } from './pages/Profile/Profile';
import { Register } from './pages/Register/Register';
import { VerifyEmail } from './pages/VerifyEmail/VerifyEmail';

// Защищенный роут: проверяет токен перед доступом к кабинету
function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = Cookies.get('accessToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <main className="page-shell">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/verify-email"
          element={<VerifyEmail />}
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile onLogout={() => navigate('/login')} />
            </ProtectedRoute>
          }
        />
        {/* Редирект для любых несуществующих страниц */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}


export default App;