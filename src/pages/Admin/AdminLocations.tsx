import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { 
  getAdminLocations, 
  createAdminLocation, 
  deleteAdminLocation, 
  type CreateLocationPayload 
} from '../../api/adminLocations';
import { useLanguage } from '../../hooks/useLanguage';

export const AdminLocations: React.FC = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  // 1. Получение списка локаций
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: getAdminLocations,
  });

  // 2. Настройка React Hook Form
  const { 
    register, 
    handleSubmit, 
    reset, 
    formState: { errors, isSubmitting } 
  } = useForm<CreateLocationPayload>();

  // 3. Мутация создания локации
  const createMutation = useMutation({
    mutationFn: createAdminLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-locations'] });
      reset();
      setServerError(null);
    },
    onError: (err: any) => {
      setServerError(err.response?.data?.message || t('Не удалось создать локацию'));
    },
  });

  // 4. Мутация удаления локации
  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteAdminLocation(id, 'Удалено администратором'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-locations'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || t('Не удалось удалить площадку'));
    },
});

  const onSubmit = (data: CreateLocationPayload) => {
    // Приводим числовые координаты, если они введены
    const payload: CreateLocationPayload = {
      ...data,
      address: {
        ...data.address,
        latitude: data.address.latitude ? Number(data.address.latitude) : undefined,
        longitude: data.address.longitude ? Number(data.address.longitude) : undefined,
      }
    };
    createMutation.mutate(payload);
  };

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`${t('Вы уверены, что хотите удалить локацию')} "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#1a202c', margin: 0 }}>{t('Управление локациями')}</h1>
          <p style={{ color: '#718096', margin: '4px 0 0' }}>{t('Площадки, концертные залы и стадионы')}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px', alignItems: 'start' }}>
        {/* Форма добавления локации */}
        <div className="content-card" style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{t('Добавить локацию')}</h3>

          {serverError && (
            <div className="notice-banner" style={{ backgroundColor: '#fff5f5', color: '#c53030', marginBottom: '16px', padding: '10px', borderRadius: '6px' }}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label className="field">
              <span>{t('Название площадки *')}</span>
              <input 
                type="text" 
                placeholder={t('Минск-Арена')} 
                {...register('name', { required: t('Введите название') })} 
              />
              {errors.name && <span className="field-error">{errors.name.message}</span>}
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label className="field">
                <span>{t('Страна')}</span>
                <input type="text" placeholder={t('Беларусь')} {...register('address.country')} />
              </label>
              <label className="field">
                <span>{t('Город')}</span>
                <input type="text" placeholder={t('Минск')} {...register('address.city')} />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <label className="field">
                <span>{t('Улица')}</span>
                <input type="text" placeholder={t('пр-т Победителей')} {...register('address.street')} />
              </label>
              <label className="field">
                <span>{t('Дом / Корпус')}</span>
                <input type="text" placeholder="111" {...register('address.building')} />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label className="field">
                <span>{t('Широта (lat)')}</span>
                <input type="number" step="any" placeholder="53.93" {...register('address.latitude')} />
              </label>
              <label className="field">
                <span>{t('Долгота (lng)')}</span>
                <input type="number" step="any" placeholder="27.48" {...register('address.longitude')} />
              </label>
            </div>

            <button 
              type="submit" 
              className="primary-button" 
              disabled={isSubmitting || createMutation.isPending}
              style={{ marginTop: '8px' }}
            >
              {createMutation.isPending ? t('Создание...') : t('Добавить локацию')}
            </button>
          </form>
        </div>

        {/* Список существующих локаций */}
        <div className="content-card" style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
            {t('Список площадок')} ({locations.length})
          </h3>

          {isLoading ? (
            <p style={{ color: '#718096' }}>{t('Загрузка локаций...')}</p>
          ) : locations.length === 0 ? (
            <p style={{ color: '#a0aec0' }}>{t('Площадок пока нет. Добавьте первую слева.')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {locations.map((loc) => (
                <div 
                  key={loc.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px 16px', 
                    borderRadius: '8px', 
                    border: '1px solid #edf2f7',
                    background: '#f8fafc' 
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '16px', color: '#2d3748' }}>{loc.name}</strong>
                    <div style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>
                      {[loc.address?.country, loc.address?.city, loc.address?.street, loc.address?.building]
                        .filter(Boolean)
                        .join(', ') || t('Адрес не указан')}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleDelete(loc.id, loc.name)}
                    disabled={deleteMutation.isPending}
                    style={{ 
                      background: 'none', 
                      border: '1px solid #feb2b2', 
                      color: '#e53e3e', 
                      padding: '6px 12px', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    {t('Удалить')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};