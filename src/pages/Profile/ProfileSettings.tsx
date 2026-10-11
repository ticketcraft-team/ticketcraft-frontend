import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMyProfile, type UpdateProfilePayload, type UserProfileResponse } from '../../api/user';
import { useLanguage } from '../../hooks/useLanguage';

interface ProfileSettingsProps {
  profile: UserProfileResponse;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ profile }) => {
  const { t, language, setLanguage } = useLanguage();
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Проверяем, пустой ли профиль (нет ни имени, ни фамилии, ни телефона)
  const isProfileEmpty = !profile.firstName && !profile.lastName && !profile.phoneNumber;

  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<UpdateProfilePayload>({
    defaultValues: {
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      phoneNumber: profile.phoneNumber || '',
    },
  });

  const mutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile'], updatedProfile);
      // Меняем текст успеха в зависимости от режима
      setSuccessMsg(t(isProfileEmpty ? 'Данные успешно сохранены!' : 'Профиль успешно обновлен!'));
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (error: any) => {
      setSuccessMsg(null);
      setErrorMsg(error.response?.data?.message || t('Ошибка при сохранении данных'));
    },
  });

  const onSubmit = (data: UpdateProfilePayload) => {
    mutation.mutate(data);
  };

  return (
    <div className="content-card settings-card">
      <h3 className="settings-title">{t('Личные данные')}</h3>
      
      {/* Динамическая подсказка для пользователя */}
      {isProfileEmpty ? (
        <p className="settings-description">
          {t('Ваш профиль пока пуст. Заполните данные ниже, чтобы мы знали, как к вам обращаться, и могли связаться с вами при оформлении билетов.')}
        </p>
      ) : (
        <p className="settings-description">
          {t('Здесь вы можете актуализировать свои контактные данные.')}
        </p>
      )}
      
      {successMsg && (
        <div className="notice-banner notice-banner-success">
          {successMsg}
        </div>
      )}
      
      {errorMsg && (
        <div className="notice-banner notice-banner-error">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        <label className="field">
          <span>{t('Имя')}</span>
          <input
            type="text"
            placeholder={t(isProfileEmpty ? 'Введите ваше имя' : 'Ваше имя')}
            {...register('firstName')}
          />
        </label>

        <label className="field">
          <span>{t('Фамилия')}</span>
          <input
            type="text"
            placeholder={t(isProfileEmpty ? 'Введите вашу фамилию' : 'Ваша фамилия')}
            {...register('lastName')}
          />
        </label>

        <label className="field">
          <span>{t('Номер телефона')}</span>
          <input
            type="tel"
            placeholder={t(isProfileEmpty ? 'Например: +1234567890' : '+1234567890')}
            {...register('phoneNumber')}
          />
        </label>

        <button 
          type="submit" 
          className="primary-button" 
          style={{ marginTop: '12px' }}
          disabled={mutation.isPending || isSubmitting}
        >
          {mutation.isPending 
            ? t('Сохранение...') 
            : isProfileEmpty 
              ? t('Сохранить данные') 
              : t('Обновить данные')}
        </button>
      </form>

      <div className="language-setting">
        <div>
          <h4>{t('Язык интерфейса')}</h4>
          <p>{t('Выберите язык для всего сайта. Настройка сохранится на этом устройстве.')}</p>
        </div>
        <div className="language-options" role="group" aria-label={t('Язык интерфейса')}>
          <button
            type="button"
            className={language === 'ru' ? 'language-option selected' : 'language-option'}
            aria-pressed={language === 'ru'}
            onClick={() => setLanguage('ru')}
          >
            {t('Русский')}
          </button>
          <button
            type="button"
            className={language === 'en' ? 'language-option selected' : 'language-option'}
            aria-pressed={language === 'en'}
            onClick={() => setLanguage('en')}
          >
            {t('Английский')}
          </button>
        </div>
      </div>
    </div>
  );
};