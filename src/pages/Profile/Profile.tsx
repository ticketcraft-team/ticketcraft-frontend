import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyProfile, getMyActiveTickets, getMyOrders } from '../../api/user';
import { refundTickets } from '../../api/booking';
import { initiatePayment } from '../../api/payment';
import { logoutUser } from '../../api/auth';
import { TicketCard } from './TicketCard';
import { ProfileSettings } from './ProfileSettings';
import { PasswordSettings } from './SettingsTab';
import { apiClient } from '../../api/client';
import { useLanguage } from '../../hooks/useLanguage';

interface ProfileProps {
  onLogout: () => void;
}

const cancelOrderApi = async (orderId: string | number) => {
  await apiClient.post(`/api/v1/orders/${orderId}/cancel`);
};

const OrderCountdownTimer: React.FC<{ createdAt?: string; onExpire?: () => void }> = ({
  createdAt,
  onExpire,
}) => {
  const { t } = useLanguage();
  const calculateSecondsLeft = () => {
    if (!createdAt) return 0;
    const createdTime = new Date(createdAt).getTime();
    if (isNaN(createdTime)) return 0;
    const expireTime = createdTime + 15 * 60 * 1000;
    const diff = expireTime - Date.now();
    return Math.floor(diff / 1000);
  };

  const [secondsLeft, setSecondsLeft] = useState(calculateSecondsLeft);

  useEffect(() => {
    const update = () => {
      const left = calculateSecondsLeft();
      setSecondsLeft(left);
      if (left <= 0) {
        onExpire?.();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  if (secondsLeft <= 0) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          color: '#ef4444',
          fontWeight: 600,
          fontSize: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          padding: '2px 8px',
          borderRadius: '6px',
          border: '1px solid rgba(239, 68, 68, 0.25)',
        }}
      >
        ⏳ {t('Время истекло')}
      </span>
    );
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        color: '#f59e0b',
        fontWeight: 700,
        fontSize: '12px',
        background: 'rgba(245, 158, 11, 0.12)',
        padding: '2px 8px',
        borderRadius: '6px',
        border: '1px solid rgba(245, 158, 11, 0.35)',
      }}
    >
      ⏱ {timeFormatted}
    </span>
  );
};

export const Profile: React.FC<ProfileProps> = ({ onLogout }) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'tickets' | 'orders' | 'settings'>('tickets');
  const [payingOrderId, setPayingOrderId] = useState<string | number | null>(null);

  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});

  const { 
    data: profile, 
    isLoading: isProfileLoading, 
    isError: isProfileError 
  } = useQuery({ 
    queryKey: ['profile'], 
    queryFn: () => getMyProfile() 
  });

  const { data: ticketsRaw = [] } = useQuery({ 
    queryKey: ['tickets'], 
    queryFn: () => getMyActiveTickets() 
  });

  const { data: ordersRaw } = useQuery({ 
    queryKey: ['orders'], 
    queryFn: () => getMyOrders() 
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (orderId: string | number) => cancelOrderApi(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || t('Не удалось отменить заказ'));
    }
  });

  const refundTicketMutation = useMutation({
    mutationFn: (ticketCode: string) => refundTickets([ticketCode]),
    onSuccess: () => {
      alert(t('Билет успешно возвращён!'));
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || t('Не удалось оформить возврат билета'));
    }
  });

  const handlePayOrder = async (orderId: string | number) => {
    try {
      setPayingOrderId(orderId);
      const res = await initiatePayment({
        orderId,
        provider: 'STRIPE',
        idempotencyKey: crypto.randomUUID(),
      });

      if (res.paymentUrl) {
        sessionStorage.setItem('pending_stripe_payment', 'true');
        window.location.href = res.paymentUrl;
        return;
      }

      alert(t('Не удалось получить ссылку на оплату'));
    } catch (err: any) {
      console.error('Ошибка оплаты:', err);
      alert(err.response?.data?.message || t('Ошибка запуска оплаты'));
    } finally {
      setPayingOrderId(null);
    }
  };

  const ordersList: any[] = useMemo(() => {
    if (!ordersRaw) return [];
    if (Array.isArray(ordersRaw)) return ordersRaw;
    if (Array.isArray((ordersRaw as any).content)) return (ordersRaw as any).content;
    return [];
  }, [ordersRaw]);

  const ticketsList: any[] = useMemo(() => {
    if (!ticketsRaw) return [];
    if (Array.isArray(ticketsRaw)) return ticketsRaw;
    if (Array.isArray((ticketsRaw as any).content)) return (ticketsRaw as any).content;
    return [];
  }, [ticketsRaw]);

  const ordersMap = useMemo(() => {
    const map = new Map<string, number>();
    ordersList.forEach((order) => {
      if (order?.orderId) {
        map.set(String(order.orderId), Number(order.totalAmount) || 0);
      }
    });
    return map;
  }, [ordersList]);

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
  };

  const isAdmin = profile?.roles?.includes('ADMIN');

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const tabsElement = tabsRef.current;
      const activeButton = tabRefs.current[activeTab];

      if (!tabsElement || !activeButton) return;

      const tabsRect = tabsElement.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      setIndicatorStyle({
        left: buttonRect.left - tabsRect.left,
        top: buttonRect.top - tabsRect.top,
        width: buttonRect.width,
        height: buttonRect.height,
      });
    };

    updateIndicator();

    const resizeObserver = new ResizeObserver(updateIndicator);
    if (tabsRef.current) {
      resizeObserver.observe(tabsRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [activeTab, isAdmin]);

  if (isProfileLoading) {
    return (
      <div className="profile-loading">
        <div className="profile-spinner" />
        <p>{t('Загрузка личного кабинета...')}</p>
      </div>
    );
  }

  if (isProfileError) {
    return (
      <div className="profile-error">
        <p>{t('Ошибка загрузки данных профиля')}</p>
        <button className="primary-button" onClick={handleLogout}>
          {t('Выйти и войти заново')}
        </button>
      </div>
    );
  }

  return (
    <div className="profile-shell">
      <div className="profile-layout">
        <aside className="profile-sidebar">
          <div className="brand-row">
            <div className="brand-mark">TC</div>
            <span>TicketCraft</span>
          </div>

          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {(profile?.firstName?.[0] || profile?.username?.[0] || 'U').toUpperCase()}
            </div>
          </div>

          <div className="profile-greeting">
            <p className="small-label">{t('Личный кабинет')}</p>
            <h1>
              {t('Привет, ')}{profile?.firstName || profile?.username || t('пользователь')}!
            </h1>
          </div>

          <div className="profile-meta-list">
            <div>
              <span>Email</span>
              <strong>{profile?.email || '—'}</strong>
            </div>
            <div>
              <span>{t('Роль')}</span>
              <strong>{profile?.roles?.join(', ') || '—'}</strong>
            </div>
          </div>

          <button
            className="profile-events-button"
            onClick={() => navigate('/events')}
          >
            <span className="profile-events-icon" aria-hidden="true">✦</span>
            <span>{t('Все события')}</span>
            <span className="profile-events-arrow" aria-hidden="true">↗</span>
          </button>

          {isAdmin && (
            <>
              <button 
                className="primary-button" 
                onClick={() => navigate('/admin/locations')}
                style={{
                  marginBottom: '8px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>⚙</span>
                <span>{t('Панель админа')}</span>
              </button>

              <button 
                className="primary-button" 
                onClick={() => navigate('/admin/validator')}
                style={{
                  marginBottom: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>🎫</span>
                <span>{t('Контроль билетов')}</span>
              </button>
            </>
          )}

          <button className="logout-button" onClick={handleLogout}>
            {t('Выйти')}
          </button>
        </aside>

        <main className="profile-main">
          <div className="profile-leaves" aria-hidden="true">
            <span className="profile-leaf profile-leaf-one" />
            <span className="profile-leaf profile-leaf-two" />
            <span className="profile-leaf profile-leaf-three" />
            <span className="profile-leaf profile-leaf-four" />
          </div>

          <div className="profile-header-card">
            <div className="profile-header-copy">
              <p className="small-label">{t('Аккаунт')}</p>
              <h2>{t('Общая информация')}</h2>
            </div>
            <div className="profile-header-message">
              <span>{t('ЛИЧНЫЙ ПРОФИЛЬ')}</span>
              <p>{t('Всё важное о вашем аккаунте и билетах в одном месте.')}</p>
            </div>
            <div className="profile-header-status">
              <span className="profile-header-orbit" aria-hidden="true" />
              <span className="status-badge">Online</span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <span>{t('Имя пользователя')}</span>
              <strong>{profile?.username || '—'}</strong>
            </div>
            <div className="info-item">
              <span>{t('Имя и фамилия')}</span>
              <strong>{[profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || '—'}</strong>
            </div>
            <div className="info-item">
              <span>{t('Телефон')}</span>
              <strong>{profile?.phoneNumber || '—'}</strong>
            </div>
            <div className="info-item">
              <span>{t('Дата регистрации')}</span>
              <strong>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU') : '—'}</strong>
            </div>
          </div>

          <div ref={tabsRef} className="tabs-shell">
            <span
              className={`tab-indicator tab-indicator-${activeTab}`}
              style={indicatorStyle}
              aria-hidden="true"
            />
            <button
              ref={(element) => { tabRefs.current.tickets = element; }}
              className={activeTab === 'tickets' ? 'tab-button active' : 'tab-button'}
              onClick={() => setActiveTab('tickets')}
            >
              {t('Активные билеты')} ({ticketsList.length})
            </button>
            <button
              ref={(element) => { tabRefs.current.orders = element; }}
              className={activeTab === 'orders' ? 'tab-button active' : 'tab-button'}
              onClick={() => setActiveTab('orders')}
            >
              {t('Мои заказы')} ({ordersList.length})
            </button>
            <button
              ref={(element) => { tabRefs.current.settings = element; }}
              className={activeTab === 'settings' ? 'tab-button active' : 'tab-button'}
              onClick={() => setActiveTab('settings')}
            >
              {t('Настройки профиля')}
            </button>
          </div>

          <div className="tab-content">
            {/* Вкладка 1: Карточки билетов */}
            {activeTab === 'tickets' && (
              <div>
                {ticketsList.length === 0 ? (
                  <div className="content-card" style={{ textAlign: 'center', padding: '48px 16px' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎟️</div>
                    <p className="empty-state">{t('У вас пока нет активных билетов.')}</p>
                    <button
                      className="primary-button"
                      style={{ marginTop: '16px', display: 'inline-block' }}
                      onClick={() => navigate('/events')}
                    >
                      {t('Выбрать событие')}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {ticketsList.map((ticket: any, index: number) => {
                      const ticketWithPrice = {
                        ...ticket,
                        price: ticket.price ?? ordersMap.get(String(ticket.orderId)) ?? 0,
                      };

                      return (
                        <TicketCard
                          key={ticket.ticketId || ticket.ticketCode || index}
                          ticket={ticketWithPrice}
                          onDownloadPdf={(code) => {
                            window.open(`/api/v1/tickets/${code}/pdf`, '_blank');
                          }}
                          onRefundTicket={(code) => refundTicketMutation.mutate(code)}
                          isRefunding={refundTicketMutation.isPending}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Вкладка 2: Карточки заказов */}
            {activeTab === 'orders' && (
              <div>
                {ordersList.length === 0 ? (
                  <div className="content-card" style={{ textAlign: 'center', padding: '48px 16px' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>📦</div>
                    <p className="empty-state">{t('У вас пока нет оформленных заказов.')}</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {ordersList.map((order: any, index: number) => {
                      const isPending = order.status === 'PENDING_PAYMENT';
                      const isPaid = order.status === 'PAID';

                      return (
                        <div
                          key={order.orderId || index}
                          className="content-card"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '16px',
                            border: isPending ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #334155',
                            borderRadius: '16px',
                            padding: '20px 24px',
                            background: '#0f172a',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '13px', color: '#94a3b8' }}>{t('Заказ')} #{order.orderId}</span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                  color: isPaid ? '#34d399' : '#818cf8',
                                  border: isPaid ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                                }}
                              >
                                {t(order.status)}
                              </span>

                              {isPending && (
                                <OrderCountdownTimer
                                  createdAt={order.createdAt}
                                  onExpire={() => {
                                    queryClient.invalidateQueries({ queryKey: ['orders'] });
                                  }}
                                />
                              )}
                            </div>

                            <h4 style={{ fontSize: '17px', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>
                              {order.eventName || t('Событие')}
                            </h4>
                            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                              {t('Зал: ')}{order.hallName || t('Основной зал')}{t(' • Билетов: ')}{order.itemsCount ?? 1}{t(' шт.')}
                            </p>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '12px', color: '#64748b' }}>{t('Сумма')}</span>
                              <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399' }}>
                                {order.totalAmount ?? 0} $
                              </div>
                            </div>

                            {isPending && (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  disabled={payingOrderId === order.orderId}
                                  onClick={() => handlePayOrder(order.orderId)}
                                  style={{
                                    padding: '9px 18px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    borderRadius: '10px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                  }}
                                >
                                  {payingOrderId === order.orderId ? t('Переход...') : t('Оплатить')}
                                </button>

                                <button
                                  type="button"
                                  disabled={cancelOrderMutation.isPending}
                                  onClick={() => cancelOrderMutation.mutate(order.orderId)}
                                  style={{
                                    padding: '9px 14px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#f87171',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {t('Отменить')}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Вкладка 3: Настройки */}
            {activeTab === 'settings' && profile && (
              <div className="settings-layout">
                <ProfileSettings profile={profile} />
                <PasswordSettings />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};