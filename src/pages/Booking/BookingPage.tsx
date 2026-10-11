import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getSessionSeats,
  holdReservation,
  createOrderFromHold,
  type Seat,
  type SessionSeatLayout,
} from '../../api/booking';
import { initiatePayment } from '../../api/payment';
import { useLanguage } from '../../hooks/useLanguage';

export const BookingPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [layout, setLayout] = useState<SessionSeatLayout | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<number | string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    getSessionSeats(sessionId)
      .then(setLayout)
      .catch((err) => {
        console.error(err);
        setError(t('Не удалось загрузить схему мест'));
      });
  }, [sessionId, t]);

  const rows = useMemo(() => {
    if (!layout?.seats) return {} as Record<number, Seat[]>;

    return layout.seats.reduce<Record<number, Seat[]>>((acc, seat) => {
      const rowKey = seat.rowNumber ?? 1;
      acc[rowKey] = acc[rowKey] || [];
      acc[rowKey].push(seat);
      return acc;
    }, {});
  }, [layout]);

  Object.values(rows).forEach((rowSeats) => {
    rowSeats.sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0));
  });

  const toggleSeat = (seat: Seat) => {
    if (seat.status !== 'AVAILABLE') return;

    setSelectedSeatIds((prev) => {
      const next = new Set(prev);
      if (next.has(seat.sessionSeatId)) {
        next.delete(seat.sessionSeatId);
      } else {
        next.add(seat.sessionSeatId);
      }
      return next;
    });
  };

  const selectedSeats = useMemo(() => {
    if (!layout?.seats) return [];
    return layout.seats.filter((s) => selectedSeatIds.has(s.sessionSeatId));
  }, [layout, selectedSeatIds]);

  const totalPrice = useMemo(
    () => selectedSeats.reduce((sum, seat) => sum + (seat.price || 0), 0),
    [selectedSeats]
  );

  const formatPrice = (value: number) =>
    new Intl.NumberFormat(language === 'en' ? 'en-US' : 'ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const removeSeat = (seatId: number | string) => {
    setSelectedSeatIds((prev) => {
      const next = new Set(prev);
      next.delete(seatId);
      return next;
    });
  };

  const getSeatStyles = (seat: Seat, isSelected: boolean, isOccupied: boolean): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: '38px',
      height: '38px',
      borderRadius: '10px 10px 6px 6px',
      fontSize: '11px',
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
      outline: 'none',
      userSelect: 'none',
    };

    if (isOccupied) {
      return {
        ...base,
        background: '#1e293b',
        border: '1px solid #334155',
        color: '#475569',
        cursor: 'not-allowed',
        opacity: 0.35,
      };
    }

    if (isSelected) {
      return {
        ...base,
        background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
        border: '1.5px solid #a5b4fc',
        color: '#ffffff',
        cursor: 'pointer',
        boxShadow: '0 0 16px rgba(99, 102, 241, 0.75)',
        transform: 'scale(1.08)',
      };
    }

    if (seat.seatType === 'VIP') {
      return {
        ...base,
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1.5px solid rgba(245, 158, 11, 0.6)',
        color: '#fbbf24',
        cursor: 'pointer',
        boxShadow: '0 0 8px rgba(245, 158, 11, 0.15)',
      };
    }

    if ((seat.seatType as string) === 'LOVE_SEAT') {
      return {
        ...base,
        background: 'rgba(244, 63, 94, 0.12)',
        border: '1.5px solid rgba(244, 63, 94, 0.6)',
        color: '#fb7185',
        cursor: 'pointer',
        boxShadow: '0 0 8px rgba(244, 63, 94, 0.15)',
      };
    }

    return {
      ...base,
      background: '#1e293b',
      border: '1.5px solid #475569',
      color: '#cbd5e1',
      cursor: 'pointer',
    };
  };

  const handleBooking = async () => {
    if (!sessionId || selectedSeatIds.size === 0) return;
    setSubmitting(true);

    try {
      const holdRes = await holdReservation({
        sessionId,
        sessionSeatIds: Array.from(selectedSeatIds),
      });

      const orderRes = await createOrderFromHold({
        groupId: holdRes.groupId,
      });

      const paymentRes = await initiatePayment({
        orderId: orderRes.orderId,
        provider: 'STRIPE',
        idempotencyKey: crypto.randomUUID(),
      });

      if (paymentRes.paymentUrl) {
        sessionStorage.setItem('pending_stripe_payment', 'true');
        window.location.href = paymentRes.paymentUrl;
        return;
      }

      alert(`${t('Заказ')} #${orderRes.orderId} ${t('успешно создан!')}`);
      navigate('/profile');
    } catch (err: any) {
      console.error('Ошибка бронирования/оплаты:', err);
      alert(err.response?.data?.message || t('Произошла ошибка при оформлении заказа и переходе к оплате'));
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', color: '#f87171', background: '#020617', minHeight: '100vh' }}>
        {error}
      </div>
    );
  }

  if (!layout) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', color: '#94a3b8', background: '#020617', minHeight: '100vh' }}>
        {t('Загрузка схемы зала...')}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 0%, #0f172a 0%, #020617 75%, #000000 100%)',
        color: '#f8fafc',
        padding: '36px 20px 80px',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Шапка события */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.25em',
              color: '#818cf8',
              fontWeight: 700,
            }}
          >
            TicketCraft • {t('Бронирование')}
          </span>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 900,
              margin: '10px 0 6px',
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            {layout.eventName}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            {t('Сеанс')} #{layout.sessionId} · {t('Зал')} #{layout.hallId}
          </p>
        </div>

        {/* Основная сетка: Зал слева, Итог справа */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '32px',
            alignItems: 'start',
          }}
        >
          {/* Секция зала */}
          <section
            style={{
              background: '#0a0f1d',
              border: '1px solid #1e293b',
              borderRadius: '24px',
              padding: '28px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Верхняя строка схемы и легенды */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '32px',
              }}
            >
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#64748b', fontWeight: 700 }}>
                  {t('Схема зала')}
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0 0', color: '#ffffff' }}>
                  {t('Выберите места')}
                </h2>
              </div>

              {/* Легенда */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  background: '#020617',
                  border: '1px solid #1e293b',
                  borderRadius: '999px',
                  padding: '6px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#1e293b', border: '1px solid #475569' }} />
                  <span>{t('Свободно')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#6366f1', boxShadow: '0 0 6px #6366f1' }} />
                  <span>{t('Выбрано')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#fbbf24' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.3)', border: '1px solid #f59e0b' }} />
                  <span>VIP</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#1e293b' }} />
                  <span>{t('Занято')}</span>
                </div>
              </div>
            </div>

            {/* Изогнутый неоновый экран */}
            <div style={{ width: '100%', maxWidth: '580px', marginBottom: '44px', textAlign: 'center' }}>
              <div
                style={{
                  height: '6px',
                  width: '100%',
                  background: 'linear-gradient(90deg, transparent 0%, #6366f1 50%, transparent 100%)',
                  borderRadius: '50%',
                  boxShadow: '0 0 24px 6px rgba(99, 102, 241, 0.55)',
                }}
              />
              <div
                style={{
                  height: '34px',
                  background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.12) 0%, transparent 100%)',
                  clipPath: 'polygon(6% 0%, 94% 0%, 100% 100%, 0% 100%)',
                }}
              />
              <p
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.35em',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  fontWeight: 800,
                  marginTop: '-10px',
                }}
              >
                {t('ЭКРАН')}
              </p>
            </div>

            {/* Сетка рядов */}
            <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', minWidth: 'max-content', margin: '0 auto' }}>
                {Object.entries(rows).map(([rowNum, rowSeats]) => (
                  <div key={rowNum} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '24px', fontSize: '12px', fontWeight: 800, color: '#64748b', textAlign: 'right', userSelect: 'none' }}>
                      {rowNum}
                    </span>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {rowSeats.map((seat) => {
                        const isSelected = selectedSeatIds.has(seat.sessionSeatId);
                        const isOccupied = seat.status !== 'AVAILABLE';
                        const style = getSeatStyles(seat, isSelected, isOccupied);

                        return (
                          <button
                            key={seat.sessionSeatId}
                            type="button"
                            disabled={isOccupied}
                            onClick={() => toggleSeat(seat)}
                            title={`${t('Ряд')} ${seat.rowNumber}, ${t('Место')} ${seat.seatNumber} ($${seat.price})`}
                            style={style}
                            onMouseEnter={(e) => {
                              if (!isOccupied && !isSelected) {
                                e.currentTarget.style.transform = 'scale(1.12)';
                                e.currentTarget.style.borderColor = '#818cf8';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isOccupied && !isSelected) {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.borderColor =
                                  seat.seatType === 'VIP' ? 'rgba(245, 158, 11, 0.6)' : '#475569';
                              }
                            }}
                          >
                            {seat.seatNumber}
                          </button>
                        );
                      })}
                    </div>

                    <span style={{ width: '24px', fontSize: '12px', fontWeight: 800, color: '#64748b', textAlign: 'left', userSelect: 'none' }}>
                      {rowNum}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Боковая карточка заказа */}
          <aside
            style={{
              background: '#0a0f1d',
              border: '1px solid #1e293b',
              borderRadius: '24px',
              padding: '28px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
              position: 'sticky',
              top: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#64748b', fontWeight: 700 }}>
                  {t('Итог')}
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0', color: '#ffffff' }}>
                  {t('Ваш выбор')}
                </h3>
              </div>
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#a5b4fc',
                }}
              >
                {selectedSeatIds.size} {t('мест')}
              </div>
            </div>

            {/* Список выбранных мест */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', marginBottom: '24px' }}>
              {selectedSeats.length === 0 ? (
                <div
                  style={{
                    padding: '28px 16px',
                    textAlign: 'center',
                    border: '1px dashed #334155',
                    borderRadius: '16px',
                    color: '#64748b',
                    fontSize: '13px',
                    background: '#020617',
                  }}
                >
                  {t('Пока ничего не выбрано. Нажмите на свободные места в схеме.')}
                </div>
              ) : (
                selectedSeats.map((seat) => (
                  <div
                    key={seat.sessionSeatId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '14px',
                      padding: '12px 14px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                        {t('Ряд')} {seat.rowNumber}, {t('Место')} {seat.seatNumber}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {seat.seatType === 'VIP' ? 'VIP' : t('Стандарт')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#34d399' }}>
                        ${formatPrice(seat.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSeat(seat.sessionSeatId)}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: '#1e293b',
                          border: '1px solid #334155',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Итоговая сумма */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '16px',
                padding: '16px 20px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
                <span>{t('К оплате')}</span>
                <span>{selectedSeatIds.size} шт.</span>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#ffffff', marginTop: '6px' }}>
                ${formatPrice(totalPrice)}
              </div>
            </div>

            {/* Кнопка оплаты */}
            <button
              type="button"
              disabled={selectedSeatIds.size === 0 || submitting}
              onClick={handleBooking}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '14px',
                background:
                  selectedSeatIds.size === 0 || submitting
                    ? '#334155'
                    : 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '15px',
                fontWeight: 800,
                cursor: selectedSeatIds.size === 0 || submitting ? 'not-allowed' : 'pointer',
                boxShadow:
                  selectedSeatIds.size === 0 || submitting
                    ? 'none'
                    : '0 8px 24px rgba(99, 102, 241, 0.45)',
                transition: 'all 0.2s ease',
              }}
            >
              {submitting ? t('Оплата...') : `${t('Оплатить')} →`}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
};