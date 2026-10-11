import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { 
  getAdminEvents, 
  createAdminEvent, 
  deleteAdminEvent, 
  type CreateEventPayload 
} from '../../api/adminEvents';
import { useLanguage } from '../../hooks/useLanguage';

export const AdminEvents: React.FC = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  // 1. Получение пагинированного списка событий
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['admin-events', { search, page }],
    queryFn: () => getAdminEvents({ search, page, size: 8 }),
  });

  // 2. Форма создания события
  const { 
    register, 
    handleSubmit, 
    reset, 
    formState: { errors, isSubmitting } 
  } = useForm<CreateEventPayload>({
    defaultValues: {
      ageRating: '16+',
      durationMinutes: 120,
    }
  });

  // 3. Мутация создания
  const createMutation = useMutation({
    mutationFn: createAdminEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      reset();
      setServerError(null);
    },
    onError: (err: any) => {
      setServerError(err.response?.data?.message || t('Ошибка при создании события'));
    },
  });

  // 4. Мутация удаления
  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteAdminEvent(id, 'Удалено администратором'),
    onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['admin-events'] });
  },
  onError: (err: any) => {
    alert(err.response?.data?.message || t('Не удалось удалить событие'));
  },
});

  const onSubmit = (data: CreateEventPayload) => {
    createMutation.mutate({
      ...data,
      durationMinutes: Number(data.durationMinutes),
    });
  };

  const handleDelete = (id: string | number, name: string) => {
    if (window.confirm(`${t('Вы уверены, что хотите удалить событие')} "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const events = eventsData?.content || [];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', color: '#fff', margin: 0 }}>{t('Управление событиями')}</h1>
        <p style={{ color: '#a0aec0', margin: '4px 0 0' }}>{t('Концерты, спектакли, выставки и фестивали')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.5fr', gap: '32px', alignItems: 'start' }}>
        {/* Форма добавления события */}
        <div className="content-card" style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{t('Создать событие')}</h3>

          {serverError && (
            <div className="notice-banner" style={{ backgroundColor: '#fff5f5', color: '#c53030', marginBottom: '16px', padding: '10px', borderRadius: '6px' }}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label className="field">
              <span>{t('Название события *')}</span>
              <input 
                type="text" 
                placeholder={t('Рок-фестиваль 2026')} 
                {...register('name', { required: t('Введите название') })} 
              />
              {errors.name && <span className="field-error">{errors.name.message}</span>}
            </label>

            <label className="field">
              <span>{t('Описание *')}</span>
              <textarea 
                rows={3}
                placeholder={t('Подробности мероприятия, участники, программа...')} 
                {...register('description', { required: t('Введите описание') })} 
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e0', resize: 'vertical' }}
              />
              {errors.description && <span className="field-error">{errors.description.message}</span>}
            </label>

            <label className="field">
              <span>{t('Ссылка на постер (URL)')}</span>
              <input 
                type="url" 
                placeholder="https://example.com/poster.jpg" 
                {...register('posterUrl')} 
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label className="field">
                <span>{t('Возрастной рейтинг')}</span>
                <select {...register('ageRating')} style={{ padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e0' }}>
                  <option value="0+">0+</option>
                  <option value="6+">6+</option>
                  <option value="12+">12+</option>
                  <option value="16+">16+</option>
                  <option value="18+">18+</option>
                </select>
              </label>

              <label className="field">
                <span>{t('Длительность (мин)')}</span>
                <input 
                  type="number" 
                  min="1"
                  {...register('durationMinutes', { required: true })} 
                />
              </label>
            </div>

            <button 
              type="submit" 
              className="primary-button" 
              disabled={isSubmitting || createMutation.isPending}
              style={{ marginTop: '10px' }}
            >
              {createMutation.isPending ? t('Создание...') : t('Добавить событие')}
            </button>
          </form>
        </div>

        {/* Список событий */}
        <div className="content-card" style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
            <h3 style={{ margin: 0 }}>
              {t('События')} ({eventsData?.totalElements ?? 0})
            </h3>
            
            <input 
              type="text"
              placeholder={t('Поиск по названию...')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '13px', width: '180px' }}
            />
          </div>

          {isLoading ? (
            <p style={{ color: '#718096' }}>{t('Загрузка событий...')}</p>
          ) : events.length === 0 ? (
            <p style={{ color: '#a0aec0' }}>{t('Событий пока нет. Создайте первое слева.')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {events.map((evt) => (
                <div 
                  key={String(evt.id)} 
                  style={{ 
                    display: 'flex', 
                    gap: '14px', 
                    padding: '12px 14px', 
                    borderRadius: '8px', 
                    border: '1px solid #edf2f7',
                    background: '#f8fafc',
                    alignItems: 'center'
                  }}
                >
                  {evt.posterUrl ? (
                    <img 
                      src={evt.posterUrl} 
                      alt={evt.name} 
                      style={{ width: '54px', height: '70px', objectFit: 'cover', borderRadius: '6px' }}
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ width: '54px', height: '70px', background: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#a0aec0' }}>
                      {t('Нет фото')}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '15px', color: '#2d3748', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {evt.name}
                      </strong>
                      <span style={{ fontSize: '11px', background: '#edf2f7', color: '#4a5568', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        {evt.ageRating}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>
                      {evt.durationMinutes}{t(' мин')} • {t('Сеансов:')} {evt.activeSessionsCount}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleDelete(evt.id, evt.name)}
                    disabled={deleteMutation.isPending}
                    style={{ 
                      background: 'none', 
                      border: '1px solid #feb2b2', 
                      color: '#e53e3e', 
                      padding: '5px 10px', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {t('Удалить')}
                  </button>
                </div>
              ))}

              {/* Пагинация */}
              {(eventsData?.totalPages ?? 1) > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                  <button 
                    disabled={page === 0} 
                    onClick={() => setPage(p => p - 1)}
                    style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #cbd5e0', background: '#fff', cursor: 'pointer' }}
                  >
                    {t('Назад')}
                  </button>
                  <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', color: '#4a5568' }}>
                    {page + 1}{t(' из ')}{eventsData?.totalPages}
                  </span>
                  <button 
                    disabled={eventsData?.isLast} 
                    onClick={() => setPage(p => p + 1)}
                    style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #cbd5e0', background: '#fff', cursor: 'pointer' }}
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