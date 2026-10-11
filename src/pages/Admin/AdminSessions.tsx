import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { getAdminEvents } from '../../api/adminEvents';
import { getAdminLocations } from '../../api/adminLocations';
import { getAdminHalls } from '../../api/adminHalls';
import { 
  getAdminSessions, 
  createAdminSession, 
  cancelAdminSession 
} from '../../api/adminSessions';
import { useLanguage } from '../../hooks/useLanguage';

interface SessionFormData {
  eventId: string;
  hallId: string;
  startDateTime: string;
  endDateTime: string;
  basePrice: number;
}

export const AdminSessions: React.FC = () => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  // 1. Подгружаем события и локации
  const { data: eventsData } = useQuery({
    queryKey: ['admin-events', { page: 0, size: 100 }],
    queryFn: () => getAdminEvents({ page: 0, size: 100 }),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: getAdminLocations,
  });

  // Авто-выбор первой локации
  useEffect(() => {
    if (!selectedLocationId && locations.length > 0) {
      setSelectedLocationId(String(locations[0].id));
    }
  }, [locations, selectedLocationId]);

  // Залы выбранной площадки
  const { data: halls = [] } = useQuery({
    queryKey: ['admin-halls', selectedLocationId],
    queryFn: () => getAdminHalls(selectedLocationId),
    enabled: !!selectedLocationId,
  });

  // 2. Список сеансов
  const { data: sessionsData, isLoading: isSessionsLoading } = useQuery({
    queryKey: ['admin-sessions', page],
    queryFn: () => getAdminSessions({ page, size: 8 }),
  });

  // Вспомогательная функция для формата datetime-local (YYYY-MM-DDTHH:mm)
  const getInitialDates = () => {
    const start = new Date();
    start.setMinutes(start.getMinutes() + 30);
    start.setSeconds(0, 0);

    const end = new Date(start);
    end.setHours(end.getHours() + 2);

    const formatForInput = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    return {
      start: formatForInput(start),
      end: formatForInput(end),
    };
  };

  // 3. Форма создания сеанса
  const initialDates = getInitialDates();
  const { 
    register, 
    handleSubmit, 
    setValue, 
    reset, 
    formState: { errors, isSubmitting } 
  } = useForm<SessionFormData>({
    defaultValues: {
      basePrice: 50,
      startDateTime: initialDates.start,
      endDateTime: initialDates.end,
    }
  });

  // Автоматически синхронизируем первое событие и первый зал в состояние формы
  useEffect(() => {
    if (eventsData?.content && eventsData.content.length > 0) {
      setValue('eventId', String(eventsData.content[0].id));
    }
  }, [eventsData, setValue]);

  useEffect(() => {
    if (halls.length > 0) {
      setValue('hallId', String(halls[0].id));
    }
  }, [halls, setValue]);

  // Мутация создания
  const createMutation = useMutation({
    mutationFn: createAdminSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      reset({
        ...getInitialDates(),
        basePrice: 50,
        eventId: eventsData?.content?.[0] ? String(eventsData.content[0].id) : '',
        hallId: halls?.[0] ? String(halls[0].id) : '',
      });
      setServerError(null);
      alert(t('Сеанс успешно запланирован!'));
    },
    onError: (err: any) => {
      setServerError(err.response?.data?.message || t('Ошибка при создании сеанса'));
    },
  });

  // Мутация отмены
  const cancelMutation = useMutation({
    mutationFn: (sessionId: string | number) => cancelAdminSession(sessionId, 'Отменено администратором'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || t('Не удалось отменить сеанс'));
    },
  });

  const onSubmit = (formData: SessionFormData) => {
    if (!formData.eventId || !formData.hallId) {
      setServerError(t('Пожалуйста, выберите мероприятие и зал'));
      return;
    }

    try {
      const startDate = new Date(formData.startDateTime);
      const endDate = new Date(formData.endDateTime);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        setServerError(t('Проверьте корректность введённой даты и времени'));
        return;
      }

      if (endDate <= startDate) {
        setServerError(t('Время окончания должно быть позже времени начала'));
        return;
      }

      setServerError(null);
      createMutation.mutate({
        eventId: formData.eventId,
        hallId: formData.hallId,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        basePrice: Number(formData.basePrice),
      });
    } catch {
      setServerError(t('Ошибка при обработке даты'));
    }
  };

  const onFormError = (formErrors: any) => {
    const errorKeys = Object.keys(formErrors);
    if (errorKeys.length > 0) {
      setServerError(t('Заполните все обязательные поля корректными данными'));
    }
  };

  const sessions = sessionsData?.content || [];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', color: '#fff', margin: 0 }}>{t('Управление сеансами')}</h1>
        <p style={{ color: '#a0aec0', margin: '4px 0 0' }}>{t('Назначение даты, времени, зала и базовой стоимости')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr', gap: '32px', alignItems: 'start' }}>
        {/* Форма создания сеанса */}
        <div className="content-card" style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{t('Запланировать сеанс')}</h3>

          {serverError && (
            <div className="notice-banner" style={{ backgroundColor: '#fff5f5', color: '#c53030', marginBottom: '16px', padding: '10px', borderRadius: '6px' }}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit, onFormError)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label className="field">
              <span>{t('Мероприятие *')}</span>
              <select {...register('eventId', { required: t('Выберите событие') })} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0' }}>
                <option value="">{t('-- Выберите событие --')}</option>
                {eventsData?.content.map((evt) => (
                  <option key={String(evt.id)} value={String(evt.id)}>
                    {evt.name} ({evt.ageRating}, {evt.durationMinutes}{t(' мин')})
                  </option>
                ))}
              </select>
              {errors.eventId && <span className="field-error">{errors.eventId.message}</span>}
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label className="field">
                <span>{t('Площадка')}</span>
                <select 
                  value={selectedLocationId} 
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
                >
                  {locations.map((loc) => (
                    <option key={String(loc.id)} value={String(loc.id)}>{loc.name}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>{t('Зал *')}</span>
                <select {...register('hallId', { required: t('Выберите зал') })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0' }}>
                  <option value="">{t('-- Выберите зал --')}</option>
                  {halls.map((h) => (
                    <option key={String(h.id)} value={String(h.id)}>
                      {h.name} ({h.totalSeats} {t('мест')})
                    </option>
                  ))}
                </select>
                {errors.hallId && <span className="field-error">{errors.hallId.message}</span>}
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label className="field">
                <span>{t('Начало *')}</span>
                <input 
                  type="datetime-local" 
                  {...register('startDateTime', { required: t('Укажите время начала') })} 
                />
              </label>

              <label className="field">
                <span>{t('Окончание *')}</span>
                <input 
                  type="datetime-local" 
                  {...register('endDateTime', { required: t('Укажите время окончания') })} 
                />
              </label>
            </div>

            <label className="field">
              <span>{t('Базовая цена билета (руб / $) *')}</span>
              <input 
                type="number" 
                step="0.01" 
                min="0"
                {...register('basePrice', { required: t('Укажите стоимость') })} 
              />
            </label>

            <button 
              type="submit" 
              className="primary-button" 
              disabled={isSubmitting || createMutation.isPending}
              style={{ marginTop: '10px' }}
            >
              {createMutation.isPending ? t('Планирование...') : t('Создать сеанс')}
            </button>
          </form>
        </div>

        {/* Список сеансов */}
        <div className="content-card" style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{t('Сеансы в системе')} ({sessionsData?.totalElements ?? 0})</h3>

          {isSessionsLoading ? (
            <p style={{ color: '#718096' }}>{t('Загрузка сеансов...')}</p>
          ) : sessions.length === 0 ? (
            <p style={{ color: '#a0aec0' }}>{t('Пока нет активных сеансов. Создайте первый слева.')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sessions.map((s) => (
                <div 
                  key={String(s.id)} 
                  style={{ 
                    padding: '14px 16px', 
                    borderRadius: '8px', 
                    border: '1px solid #edf2f7', 
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '16px', color: '#2d3748' }}>{s.eventName}</strong>
                    <span style={{ 
                      fontSize: '11px', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontWeight: 600,
                      background: s.status === 'CANCELLED' ? '#fee2e2' : '#dcfce7',
                      color: s.status === 'CANCELLED' ? '#b91c1c' : '#15803d'
                    }}>
                      {t(s.status)}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: '#4a5568' }}>
                    📍 {t('Зал:')} <strong>{s.hallName}</strong>
                  </div>

                  <div style={{ fontSize: '13px', color: '#718096' }}>
                    🕒 {new Date(s.startTime).toLocaleString(language === 'en' ? 'en-US' : 'ru-RU')} — {new Date(s.endTime).toLocaleTimeString(language === 'en' ? 'en-US' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {s.status !== 'CANCELLED' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <button
                        onClick={() => {
                          if (window.confirm(`${t('Отменить сеанс')} "${s.eventName}"?`)) {
                            cancelMutation.mutate(s.id);
                          }
                        }}
                        disabled={cancelMutation.isPending}
                        style={{ background: 'none', border: 'none', color: '#e53e3e', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {t('Отменить сеанс')}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Пагинация */}
              {(sessionsData?.totalPages ?? 1) > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                  <button 
                    disabled={page === 0} 
                    onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', background: '#fff', cursor: 'pointer' }}
                  >
                    {t('Назад')}
                  </button>
                  <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', color: '#4a5568' }}>
                    {page + 1}{t(' из ')}{sessionsData?.totalPages}
                  </span>
                  <button 
                    disabled={sessionsData?.isLast} 
                    onClick={() => setPage((prev) => prev + 1)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', background: '#fff', cursor: 'pointer' }}
                  >
                    {t('Вперед')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};