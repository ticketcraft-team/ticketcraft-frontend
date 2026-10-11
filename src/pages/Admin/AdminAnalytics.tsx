import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  getAnalyticsSummary, 
  getLocationsAnalytics, 
  getSeatsPerformanceAnalytics,
  exportOrdersAnalytics
} from '../../api/analytics';
import { apiClient } from '../../api/client';
import { useLanguage } from '../../hooks/useLanguage';

type DatePreset = 'all' | '7d' | '30d';

export const AdminAnalytics: React.FC = () => {
  const { t } = useLanguage();
  const [preset, setPreset] = useState<DatePreset>('all');
  const [isExporting, setIsExporting] = useState(false);

  const { from, to } = React.useMemo(() => {
    if (preset === 'all') return {};
    const toDate = new Date();
    const fromDate = new Date();
    if (preset === '7d') {
      fromDate.setDate(toDate.getDate() - 7);
    } else if (preset === '30d') {
      fromDate.setDate(toDate.getDate() - 30);
    }
    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    };
  }, [preset]);

  // 1. Сводные метрики
  const { 
    data: summary, 
    isLoading: isSummaryLoading, 
    isError: isSummaryError, 
    refetch: refetchSummary 
  } = useQuery({
    queryKey: ['admin-analytics-summary', from, to],
    queryFn: () => getAnalyticsSummary({ from, to }),
  });

  // 2. Локации
  const { 
    data: locationsData = [], 
    isLoading: isLocationsLoading 
  } = useQuery({
    queryKey: ['admin-analytics-locations', from, to],
    queryFn: () => getLocationsAnalytics({ from, to }),
  });

  // 3. Эффективность мест (seats-performance)
  const {
    data: seatsData = [],
    isLoading: isSeatsLoading
  } = useQuery({
    queryKey: ['admin-analytics-seats-performance', from, to],
    queryFn: () => getSeatsPerformanceAnalytics({ from, to }),
  });

  // Справочник площадок
  const { data: locationsDirectory = [] } = useQuery({
    queryKey: ['locations-directory'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/locations');
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.content)) return data.content;
      return [];
    },
  });

  const locationNamesMap = React.useMemo(() => {
    const map = new Map<string, string>();
    locationsDirectory.forEach((loc: any) => {
      const key = String(loc.id ?? loc.locationId ?? '');
      if (key) {
        map.set(key, loc.name || loc.title || loc.city || `Площадка #${key}`);
      }
    });
    return map;
  }, [locationsDirectory]);

  // Обработчик скачивания отчета
  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportOrdersAnalytics({ from, to });
    } catch (error: any) {
      console.error('Ошибка при выгрузке отчета:', error);
      alert(error.response?.data?.message || t('Не удалось скачать отчет по заказам'));
    } finally {
      setIsExporting(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const getSeatTypeBadge = (type: string) => {
    switch (type) {
      case 'VIP':
        return { label: 'VIP', bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '#f59e0b' };
      case 'LOVE_SEAT':
        return { label: 'Love Seat', bg: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '#f43f5e' };
      default:
        return { label: 'Standard', bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '#6366f1' };
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px', color: '#f8fafc' }}>
      {/* Шапка, фильтры периода и экспорт */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>
            📊 {t('Аналитика и показатели')}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0' }}>
            {t('Сводные данные по выручке, заказам, локациям и типам мест')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Пресеты дат */}
          <div style={{ display: 'flex', gap: '8px', background: '#1e293b', padding: '4px', borderRadius: '12px' }}>
            <button
              type="button"
              onClick={() => setPreset('all')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: preset === 'all' ? '#6366f1' : 'transparent',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('Все время')}
            </button>
            <button
              type="button"
              onClick={() => setPreset('30d')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: preset === '30d' ? '#6366f1' : 'transparent',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              30 {t('дней')}
            </button>
            <button
              type="button"
              onClick={() => setPreset('7d')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: preset === '7d' ? '#6366f1' : 'transparent',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              7 {t('дней')}
            </button>
          </div>

          {/* Кнопка выгрузки отчета */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExport}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '12px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isExporting ? 'not-allowed' : 'pointer',
              opacity: isExporting ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            <span>📥</span>
            <span>{isExporting ? t('Экспорт...') : t('Выгрузить заказы')}</span>
          </button>
        </div>
      </div>

      {isSummaryLoading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
          {t('Загрузка аналитики...')}
        </div>
      )}

      {isSummaryError && (
        <div
          style={{
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: '12px',
            color: '#fca5a5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <span>{t('Ошибка загрузки сводных данных')}</span>
          <button
            onClick={() => refetchSummary()}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t('Повторить')}
          </button>
        </div>
      )}

      {summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Финансы */}
          <div>
            <h3 style={{ fontSize: '15px', color: '#94a3b8', margin: '0 0 12px', fontWeight: 700, letterSpacing: '0.05em' }}>
              {t('ФИНАНСОВЫЕ РЕЗУЛЬТАТЫ')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={cardStyle}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>{t('Чистая выручка')}</span>
                <strong style={{ fontSize: '26px', fontWeight: 800, color: '#34d399' }}>
                  ${summary.netRevenue.toFixed(2)}
                </strong>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{t('С учетом всех возвратов')}</span>
              </div>

              <div style={cardStyle}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>{t('Валовая выручка')}</span>
                <strong style={{ fontSize: '26px', fontWeight: 800, color: '#f8fafc' }}>
                  ${summary.grossRevenue.toFixed(2)}
                </strong>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{t('До вычета возвратов')}</span>
              </div>

              <div style={cardStyle}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>{t('Возвраты')}</span>
                <strong style={{ fontSize: '26px', fontWeight: 800, color: '#f87171' }}>
                  ${summary.refundedAmount.toFixed(2)}
                </strong>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {summary.refundedOrdersCount} {t('возвращенных заказов')}
                </span>
              </div>

              <div style={cardStyle}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>{t('Средний чек')}</span>
                <strong style={{ fontSize: '26px', fontWeight: 800, color: '#818cf8' }}>
                  ${summary.averageOrderValue.toFixed(2)}
                </strong>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{t('На один оплаченный заказ')}</span>
              </div>
            </div>
          </div>

          {/* Заказы */}
          <div>
            <h3 style={{ fontSize: '15px', color: '#94a3b8', margin: '0 0 12px', fontWeight: 700, letterSpacing: '0.05em' }}>
              {t('ЗАКАЗЫ И КОНВЕРСИЯ')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
              <div style={cardStyle}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>{t('Всего создано')}</span>
                <strong style={{ fontSize: '22px', fontWeight: 700 }}>{summary.totalOrdersCreated}</strong>
              </div>

              <div style={cardStyle}>
                <span style={{ fontSize: '13px', color: '#34d399' }}>{t('Оплачено')}</span>
                <strong style={{ fontSize: '22px', fontWeight: 700, color: '#34d399' }}>
                  {summary.paidOrdersCount}
                </strong>
              </div>

              <div style={cardStyle}>
                <span style={{ fontSize: '13px', color: '#f59e0b' }}>{t('Истекло по таймеру')}</span>
                <strong style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b' }}>
                  {summary.expiredOrdersCount}
                </strong>
              </div>

              <div style={cardStyle}>
                <span style={{ fontSize: '13px', color: '#f87171' }}>{t('Отменено')}</span>
                <strong style={{ fontSize: '22px', fontWeight: 700, color: '#f87171' }}>
                  {summary.cancelledOrdersCount}
                </strong>
              </div>

              <div style={cardStyle}>
                <span style={{ fontSize: '13px', color: '#38bdf8' }}>{t('Конверсия')}</span>
                <strong style={{ fontSize: '22px', fontWeight: 700, color: '#38bdf8' }}>
                  {summary.conversionRatePercent.toFixed(1)}%
                </strong>
              </div>

              <div style={cardStyle}>
                <span style={{ fontSize: '13px', color: '#fb7185' }}>{t('Процент отмен')}</span>
                <strong style={{ fontSize: '22px', fontWeight: 700, color: '#fb7185' }}>
                  {summary.cancellationRatePercent.toFixed(1)}%
                </strong>
              </div>
            </div>
          </div>

          {/* Эффективность типов мест */}
          <div>
            <h3 style={{ fontSize: '15px', color: '#94a3b8', margin: '0 0 12px', fontWeight: 700, letterSpacing: '0.05em' }}>
              💺 {t('ЭФФЕКТИВНОСТЬ КАТЕГОРИЙ МЕСТ')}
            </h3>

            {isSeatsLoading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                {t('Загрузка данных по местам...')}
              </div>
            ) : seatsData.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '32px' }}>
                <p style={{ color: '#94a3b8', margin: 0 }}>{t('Нет данных по категориям мест.')}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {seatsData.map((seat) => {
                  const badge = getSeatTypeBadge(seat.seatType);
                  const occupancy = Number(seat.occupancyRatePercent) || 0;
                  const share = Number(seat.revenueSharePercent) || 0;
                  const sold = Number(seat.soldSeatsCount) || 0;
                  const offered = Number(seat.totalOfferedSeats) || 0;
                  const rev = Number(seat.revenue) || 0;

                  return (
                    <div key={seat.seatType} style={cardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                          Доля: <strong style={{ color: '#f8fafc' }}>{share.toFixed(1)}%</strong>
                        </span>
                      </div>

                      <div style={{ marginTop: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{t('Выручка')}</span>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#34d399' }}>
                          ${rev.toFixed(2)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#cbd5e1' }}>
                        <span>Продано мест:</span>
                        <strong>{sold} / {offered}</strong>
                      </div>

                      <div style={{ marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                          <span>Заполняемость</span>
                          <span>{occupancy.toFixed(1)}%</span>
                        </div>
                        <div style={{ height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, Math.max(0, occupancy))}%`,
                              height: '100%',
                              background: occupancy > 50 ? '#10b981' : '#6366f1',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Локации */}
          <div>
            <h3 style={{ fontSize: '15px', color: '#94a3b8', margin: '0 0 12px', fontWeight: 700, letterSpacing: '0.05em' }}>
              🏛️ {t('ЭФФЕКТИВНОСТЬ ПЛОЩАДОК')}
            </h3>

            {isLocationsLoading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                {t('Загрузка данных по локациям...')}
              </div>
            ) : locationsData.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '32px' }}>
                <p style={{ color: '#94a3b8', margin: 0 }}>{t('Нет данных по локациям за выбранный период.')}</p>
              </div>
            ) : (
              <div
                style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '16px',
                  overflowX: 'auto',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ padding: '14px 18px' }}>{t('Площадка')}</th>
                      <th style={{ padding: '14px 18px' }}>{t('Сеансов')}</th>
                      <th style={{ padding: '14px 18px' }}>{t('Продано мест')}</th>
                      <th style={{ padding: '14px 18px' }}>{t('Заполняемость')}</th>
                      <th style={{ padding: '14px 18px' }}>{t('Выручка ($)')}</th>
                      <th style={{ padding: '14px 18px' }}>{t('Доля в выручке')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationsData.map((loc) => {
                      const locName = locationNamesMap.get(String(loc.locationId)) || `Площадка #${loc.locationId}`;
                      const occupancy = loc.occupancyRatePercent ?? 0;
                      const share = loc.revenueSharePercent ?? 0;

                      return (
                        <tr key={loc.locationId} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '14px 18px', fontWeight: 700, color: '#f8fafc' }}>
                            {locName}
                          </td>
                          <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>
                            {loc.totalSessionsCount}
                          </td>
                          <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>
                            {loc.soldSeatsCount} / {loc.totalOfferedSeats}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{
                                  flex: 1,
                                  height: '6px',
                                  background: '#334155',
                                  borderRadius: '3px',
                                  overflow: 'hidden',
                                  maxWidth: '80px',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${Math.min(100, Math.max(0, occupancy))}%`,
                                    height: '100%',
                                    background: occupancy > 50 ? '#10b981' : '#f59e0b',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 600 }}>{occupancy.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px', fontWeight: 800, color: '#34d399' }}>
                            ${loc.totalRevenue.toFixed(2)}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#a5b4fc',
                                fontWeight: 700,
                                fontSize: '12px',
                              }}
                            >
                              {share.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};