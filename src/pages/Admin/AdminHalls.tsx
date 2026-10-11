import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { getAdminLocations } from '../../api/adminLocations';
import { 
  getAdminHalls, 
  createAdminHall, 
  deleteAdminHall, 
  batchGenerateSeats,
  type CreateHallPayload,
  type BatchGenerateSeatsPayload,
  type HallResponse 
} from '../../api/adminHalls';
import { useLanguage } from '../../hooks/useLanguage';

export const AdminHalls: React.FC = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [activeHallForSeats, setActiveHallForSeats] = useState<HallResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // 1. Получаем список всех площадок для селектора
  const { data: locations = [] } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: getAdminLocations,
  });

  // Автоматически выбираем первую локацию при их загрузке
  React.useEffect(() => {
    if (!selectedLocationId && locations.length > 0) {
      setSelectedLocationId(String(locations[0].id));
    }
  }, [locations, selectedLocationId]);

  // 2. Получаем залы для выбранной площадки
  const { data: halls = [], isLoading: isHallsLoading } = useQuery({
    queryKey: ['admin-halls', selectedLocationId],
    queryFn: () => getAdminHalls(selectedLocationId),
    enabled: !!selectedLocationId,
  });

  // Форма создания зала
  const { 
    register, 
    handleSubmit, 
    reset, 
    formState: { errors, isSubmitting } 
  } = useForm<CreateHallPayload>({
    defaultValues: { isVip: false }
  });

  // Форма генерации мест
  const { 
    register: registerSeats, 
    handleSubmit: handleSubmitSeats, 
    reset: resetSeats,
    formState: { isSubmitting: isGeneratingSeats } 
  } = useForm<{
    rowsCount: number;
    seatsPerRow: number;
    seatType: string;
    vipRowsString: string;
  }>({
    defaultValues: {
      rowsCount: 10,
      seatsPerRow: 12,
      seatType: 'STANDARD',
      vipRowsString: '1, 2'
    }
  });

  // Мутация создания зала
  const createHallMutation = useMutation({
    mutationFn: createAdminHall,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-halls', selectedLocationId] });
      reset();
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || t('Ошибка при создании зала'));
    }
  });

  // Мутация удаления зала
  const deleteMutation = useMutation({
  mutationFn: (id: string | number) => deleteAdminHall(id, 'Удалено администратором'),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['admin-halls'] });
  },
  onError: (err: any) => {
    alert(err.response?.data?.message || t('Не удалось удалить зал'));
  },
});

  // Мутация генерации мест
  const generateSeatsMutation = useMutation({
    mutationFn: ({ hallId, data }: { hallId: string | number; data: BatchGenerateSeatsPayload }) =>
      batchGenerateSeats(hallId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-halls', selectedLocationId] });
      setActiveHallForSeats(null);
      resetSeats();
      alert(t('Места успешно сгенерированы!'));
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || t('Ошибка генерации мест'));
    }
  });

  const onSubmitHall = (data: CreateHallPayload) => {
    if (!selectedLocationId) {
      setFormError(t('Сначала выберите площадку'));
      return;
    }
    setFormError(null);

    // Отправляем точный ID выбранной площадки без принудительного округления
    createHallMutation.mutate({
      ...data,
      locationId: selectedLocationId,
    });
  };

  const onSubmitSeats = (formData: { 
    rowsCount: number; 
    seatsPerRow: number; 
    seatType: string; 
    vipRowsString: string; 
  }) => {
    if (!activeHallForSeats) return;

    const vipRowNumbers = formData.vipRowsString
      ? formData.vipRowsString
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n))
      : [];

    generateSeatsMutation.mutate({
      hallId: activeHallForSeats.id,
      data: {
        rowsCount: Number(formData.rowsCount),
        seatsPerRow: Number(formData.seatsPerRow),
        seatType: formData.seatType,
        vipRowNumbers,
      }
    });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', color: '#1a202c', margin: 0 }}>{t('Управление залами')}</h1>
        <p style={{ color: '#718096', margin: '4px 0 0' }}>{t('Настройка залов и конфигурация мест площадки')}</p>
      </div>

      {/* Выбор текущей локации */}
      <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <label style={{ fontWeight: 600, color: '#4a5568' }}>{t('Текущая площадка:')}</label>
        <select 
          value={selectedLocationId} 
          onChange={(e) => setSelectedLocationId(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '15px', minWidth: '260px' }}
        >
          {locations.map((loc) => (
            <option key={String(loc.id)} value={String(loc.id)}>
              {loc.name} ({loc.address?.city || t('Без города')})
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '32px', alignItems: 'start' }}>
        {/* Форма создания зала */}
        <div className="content-card" style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{t('Создать зал')}</h3>

          {formError && (
            <div className="notice-banner" style={{ backgroundColor: '#fff5f5', color: '#c53030', marginBottom: '16px', padding: '10px', borderRadius: '6px' }}>
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmitHall)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label className="field">
              <span>{t('Название зала *')}</span>
              <input 
                type="text" 
                placeholder={t('Главная сцена / Зал 1')} 
                {...register('name', { required: t('Введите название зала') })} 
              />
              {errors.name && <span className="field-error">{errors.name.message}</span>}
            </label>

            <label className="field">
              <span>{t('Описание зала')}</span>
              <input 
                type="text" 
                placeholder={t('Партер, амфитеатр, балкон...')} 
                {...register('description')} 
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
              <input type="checkbox" {...register('isVip')} />
              <span style={{ fontSize: '14px', color: '#4a5568' }}>{t('VIP-зал (повышенный комфорт)')}</span>
            </label>

            <button 
              type="submit" 
              className="primary-button" 
              disabled={isSubmitting || createHallMutation.isPending}
              style={{ marginTop: '12px' }}
            >
              {createHallMutation.isPending ? t('Создание...') : t('Добавить зал')}
            </button>
          </form>
        </div>

        {/* Список залов */}
        <div className="content-card" style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{t('Залы площадки')} ({halls.length})</h3>

          {isHallsLoading ? (
            <p style={{ color: '#718096' }}>{t('Загрузка залов...')}</p>
          ) : halls.length === 0 ? (
            <p style={{ color: '#a0aec0' }}>{t('В этой локации пока нет залов.')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {halls.map((hall) => (
                <div 
                  key={String(hall.id)} 
                  style={{ 
                    padding: '16px', 
                    borderRadius: '8px', 
                    border: '1px solid #edf2f7',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '17px', color: '#2d3748' }}>{hall.name}</strong>
                        {hall.isVip && (
                          <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                            VIP
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#718096' }}>
                        {hall.description || t('Без описания')}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm(`${t('Удалить зал')} "${hall.name}"?`)) {
                          deleteMutation.mutate(hall.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      {t('Удалить')}
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                    <span style={{ fontSize: '14px', color: '#4a5568' }}>
                      {t('Всего мест:')} <strong>{hall.totalSeats}</strong>
                    </span>

                    <button 
                      type="button"
                      onClick={() => setActiveHallForSeats(hall)}
                      style={{
                        padding: '6px 12px',
                        background: '#4f46e5',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      {t('⚡ Сгенерировать места')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно генерации мест */}
      {activeHallForSeats && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: '28px', borderRadius: '14px', width: '420px', maxWidth: '90%' }}>
            <h3 style={{ margin: '0 0 8px' }}>{t('Сгенерировать места')}</h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#718096' }}>
              {t('Зал:')} <strong>{activeHallForSeats.name}</strong>
            </p>

            <form onSubmit={handleSubmitSeats(onSubmitSeats)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label className="field">
                  <span>{t('Рядов (rows)')}</span>
                  <input type="number" min="1" {...registerSeats('rowsCount', { required: true })} />
                </label>
                <label className="field">
                  <span>{t('Мест в ряду')}</span>
                  <input type="number" min="1" {...registerSeats('seatsPerRow', { required: true })} />
                </label>
              </div>

              <label className="field">
                <span>{t('Базовый тип мест')}</span>
                <select {...registerSeats('seatType')} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0' }}>
                  <option value="STANDARD">STANDARD</option>
                  <option value="COMFORT">COMFORT</option>
                  <option value="VIP">VIP</option>
                </select>
              </label>

              <label className="field">
                <span>{t('VIP-ряды (через запятую)')}</span>
                <input type="text" placeholder="1, 2" {...registerSeats('vipRowsString')} />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setActiveHallForSeats(null)}
                  style={{ padding: '8px 16px', background: '#edf2f7', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  {t('Отмена')}
                </button>
                <button 
                  type="submit" 
                  className="primary-button" 
                  disabled={isGeneratingSeats || generateSeatsMutation.isPending}
                >
                  {generateSeatsMutation.isPending ? t('Генерация...') : t('Создать сетку')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};