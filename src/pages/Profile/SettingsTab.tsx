import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { changePassword, type ChangePasswordPayload } from '../../api/user';
import { useLanguage } from '../../hooks/useLanguage';

// Расширяем payload для клиентской проверки подтверждения пароля
interface PasswordFormInputs extends ChangePasswordPayload {
  confirmNewPassword: string;
}

export const PasswordSettings: React.FC = () => {
  const { t } = useLanguage();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<PasswordFormInputs>();

  // Настраиваем TanStack Query Mutation
  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setSuccessMsg(t('Пароль успешно изменен'));
      setErrorMsg(null);
      reset(); // Очищаем форму после успеха в целях безопасности
    },
    onError: (error: any) => {
      setSuccessMsg(null);
      setErrorMsg(error.response?.data?.message || t('Ошибка при смене пароля. Проверьте текущий пароль.'));
    },
  });

  const onSubmit = (data: PasswordFormInputs) => {
    mutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  // Следим за полем нового пароля, чтобы проверять совпадение
  const newPasswordValue = watch('newPassword');

  return (
    <div className="content-card settings-card">
      <h3 className="settings-title">{t('Смена пароля')}</h3>
      <p className="settings-description">
        {t('Обновляйте пароль регулярно, чтобы защитить доступ к личному кабинету.')}
      </p>
      
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
          <span>{t('Текущий пароль')}</span>
          <input
            type="password"
            placeholder={t('Введите текущий пароль')}
            {...register('currentPassword', { required: t('Обязательное поле') })}
          />
          {errors.currentPassword && <span className="field-error">{errors.currentPassword.message}</span>}
        </label>

        <label className="field">
          <span>{t('Новый пароль')}</span>
          <input
            type="password"
            placeholder={t('Новый пароль')}
            {...register('newPassword', { 
              required: t('Обязательное поле'),
              minLength: { value: 6, message: t('Минимум 6 символов') }
            })}
          />
          {errors.newPassword && <span className="field-error">{errors.newPassword.message}</span>}
        </label>

        <label className="field">
          <span>{t('Подтвердите новый пароль')}</span>
          <input
            type="password"
            placeholder={t('Повторите новый пароль')}
            {...register('confirmNewPassword', { 
              required: t('Обязательное поле'),
              validate: (value) => value === newPasswordValue || t('Пароли не совпадают')
            })}
          />
          {errors.confirmNewPassword && <span className="field-error">{errors.confirmNewPassword.message}</span>}
        </label>

        <button 
          type="submit" 
          className="primary-button" 
          disabled={mutation.isPending}
        >
          {mutation.isPending ? t('Сохранение...') : t('Обновить пароль')}
        </button>
      </form>
    </div>
  );
};