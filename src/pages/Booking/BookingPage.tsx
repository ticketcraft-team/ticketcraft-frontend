import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
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
import { EventHeader } from '../Events/EventHeader';

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

  const getSeatClassName = (seat: Seat, isSelected: boolean) => {
    if (seat.status !== 'AVAILABLE') return 'booking-seat booking-seat-occupied';
    if (isSelected) return 'booking-seat booking-seat-selected';
    if (seat.seatType === 'VIP') return 'booking-seat booking-seat-vip';
    if ((seat.seatType as string) === 'LOVE_SEAT') return 'booking-seat booking-seat-love';
    return 'booking-seat';
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
    } catch (err: unknown) {
      console.error('Ошибка бронирования/оплаты:', err);
      const message = axios.isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;
      alert(message || t('Произошла ошибка при оформлении заказа и переходе к оплате'));
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <main className="booking-page">
        <EventHeader />
        <div className="booking-state booking-state-error">{error}</div>
      </main>
    );
  }

  if (!layout) {
    return (
      <main className="booking-page">
        <EventHeader />
        <div className="booking-state">
          <span className="booking-loading-spinner" aria-hidden="true" />
          <p>{t('Загрузка схемы зала...')}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="booking-page">
      <EventHeader />
      <div className="booking-container">
        <header className="booking-header">
          <p className="booking-eyebrow">TicketCraft <span>·</span> {t('Бронирование')}</p>
          <h1>{layout.eventName}</h1>
          <p className="booking-session-meta">{t('Сеанс')} #{layout.sessionId} <span>·</span> {t('Зал')} #{layout.hallId}</p>
        </header>

        <div className="booking-layout">
          <section className="booking-hall-panel" aria-labelledby="booking-seats-title">
            <div className="booking-panel-heading">
              <div>
                <p className="booking-section-label">{t('Схема зала')}</p>
                <h2 id="booking-seats-title">{t('Выберите места')}</h2>
              </div>
              <div className="booking-legend" aria-label={t('Обозначения мест')}>
                <span><i className="booking-legend-seat booking-legend-available" />{t('Свободно')}</span>
                <span><i className="booking-legend-seat booking-legend-selected" />{t('Выбрано')}</span>
                <span><i className="booking-legend-seat booking-legend-vip" />VIP</span>
                <span><i className="booking-legend-seat booking-legend-occupied" />{t('Занято')}</span>
              </div>
            </div>

            <div className="booking-screen">
              <div className="booking-screen-glow" />
              <div className="booking-screen-surface" />
              <p>{t('ЭКРАН')}</p>
            </div>

            <div className="booking-seat-scroll">
              <div className="booking-seat-map">
                {Object.entries(rows).map(([rowNum, rowSeats]) => (
                  <div key={rowNum} className="booking-seat-row">
                    <span className="booking-row-number">{rowNum}</span>
                    <div className="booking-seat-group">
                      {rowSeats.map((seat) => {
                        const isSelected = selectedSeatIds.has(seat.sessionSeatId);
                        const isOccupied = seat.status !== 'AVAILABLE';

                        return (
                          <button
                            key={seat.sessionSeatId}
                            type="button"
                            disabled={isOccupied}
                            onClick={() => toggleSeat(seat)}
                            title={`${t('Ряд')} ${seat.rowNumber}, ${t('Место')} ${seat.seatNumber} (${formatPrice(seat.price)})`}
                            aria-pressed={isSelected}
                            aria-label={`${t('Ряд')} ${seat.rowNumber}, ${t('Место')} ${seat.seatNumber}`}
                            className={getSeatClassName(seat, isSelected)}
                          >
                            {seat.seatNumber}
                          </button>
                        );
                      })}
                    </div>
                    <span className="booking-row-number">{rowNum}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="booking-summary">
            <div className="booking-summary-heading">
              <div>
                <p className="booking-section-label">{t('Итог')}</p>
                <h2>{t('Ваш выбор')}</h2>
              </div>
              <span className="booking-seat-count">{selectedSeatIds.size} {t('мест')}</span>
            </div>

            <div className="booking-selected-list">
              {selectedSeats.length === 0 ? (
                <div className="booking-empty-selection">
                  {t('Пока ничего не выбрано. Нажмите на свободные места в схеме.')}
                </div>
              ) : (
                selectedSeats.map((seat) => (
                  <div key={seat.sessionSeatId} className="booking-selected-seat">
                    <div>
                      <strong>{t('Ряд')} {seat.rowNumber}, {t('Место')} {seat.seatNumber}</strong>
                      <span>{seat.seatType === 'VIP' ? 'VIP' : t('Стандарт')}</span>
                    </div>
                    <div className="booking-selected-price">
                      <strong>${formatPrice(seat.price)}</strong>
                      <button
                        type="button"
                        onClick={() => removeSeat(seat.sessionSeatId)}
                        aria-label={`${t('Удалить')} ${t('Ряд')} ${seat.rowNumber}, ${t('Место')} ${seat.seatNumber}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="booking-total">
              <div>
                <span>{t('К оплате')}</span>
                <span>{selectedSeatIds.size} {t('мест')}</span>
              </div>
              <strong>${formatPrice(totalPrice)}</strong>
            </div>

            <button
              type="button"
              disabled={selectedSeatIds.size === 0 || submitting}
              onClick={handleBooking}
              className="booking-pay-button"
            >
              {submitting ? t('Оплата...') : `${t('Оплатить')} →`}
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
};