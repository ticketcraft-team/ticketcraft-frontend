import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const navItems = [
    { to: '/admin/analytics', label: t('📊 Аналитика') },
    { to: '/admin/locations', label: t('📍 Площадки') },
    { to: '/admin/halls', label: t('🏛️ Залы и места') },
    { to: '/admin/events', label: t('🎭 События') },
    { to: '/admin/sessions', label: t('🎟️ Сеансы') },
  ];

  return (
    <div style={{ minHeight: '100vh', width: '100%', padding: '24px 20px' }}>
      <header
        style={{
          maxWidth: '1200px',
          margin: '0 auto 24px',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/profile')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {t('← В личный кабинет')}
          </button>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
            TicketCraft <span style={{ color: '#818cf8', fontSize: '14px', fontWeight: 500 }}>Admin Console</span>
          </span>
        </div>

        {/* Навигационные табы админки */}
        <nav style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                padding: '8px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s',
                color: isActive ? '#fff' : '#94a3b8',
                background: isActive ? '#4f46e5' : 'rgba(255, 255, 255, 0.05)',
                border: isActive ? '1px solid #6366f1' : '1px solid transparent',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Здесь будут рендериться наши страницы: Locations, Halls, Events */}
      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
};