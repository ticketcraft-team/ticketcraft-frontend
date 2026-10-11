import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { registerUser, resendVerificationEmail, type RegisterPayload } from '../../api/auth';
import { useLanguage } from '../../hooks/useLanguage';

export const Register: React.FC = () => {
  const { t } = useLanguage();
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RegisterPayload>();

  const onSubmit = async (data: RegisterPayload) => {
    setServerError(null);
    try {
      await registerUser(data);
      // Важно: больше никакого localStorage! Просто переключаем экран.
      setIsSuccess(true);
    } catch (error: any) {
      setServerError(error.response?.data?.message || t('Ошибка при регистрации'));
    }
  };

  const handleResend = async () => {
    const email = getValues('email');
    if (!email) return;

    setResendLoading(true);
    setResendStatus(null);
    try {
      await resendVerificationEmail(email);
      setResendStatus('Письмо отправлено повторно. Проверьте почту.');
    } catch (err: any) {
      setResendStatus(err.response?.data?.message || 'Не удалось отправить письмо.');
    } finally {
      setResendLoading(false);
    }
  };

  // ЭКРАН 1: Успешная регистрация (просьба проверить почту)
  if (isSuccess) {
    return (
      <section className="auth-layout">
        <div className="auth-card" style={{ margin: 'auto', textAlign: 'center' }}>
          <h2>{t('Подтвердите ваш Email')}</h2>
          <p>{t('Мы отправили ссылку для активации аккаунта на ваш адрес.')}</p>
          <p>{t('Перейдите по ссылке в письме, чтобы активировать аккаунт и войти в систему.')}</p>
          
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="secondary-button"
            >
              {resendLoading ? t('Отправка...') : t('Отправить письмо еще раз')}
            </button>
            {resendStatus && <div style={{ fontSize: 13, color: '#2b6cb0' }}>{resendStatus}</div>}

            <Link to="/login" className="primary-button" style={{ textDecoration: 'none' }}>
              {t('Перейти ко входу')}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // ЭКРАН 2: Форма регистрации
  return (
    <section className="auth-layout">
      <div className="auth-hero">
        <div className="brand-row">
          <div className="brand-mark">TC</div>
          <span>TicketCraft</span>
        </div>
        <p className="eyebrow">{t('Присоединяйтесь к нам')}</p>
        <h1>{t('Создайте аккаунт для начала работы.')}</h1>
      </div>

      <div className="auth-card">
        <div className="card-header">
          <p className="small-label">{t('Регистрация')}</p>
          <h2>{t('Создать аккаунт')}</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <label className="field">
            <span>{t('Email')}</span>
            <input
              type="email"
              placeholder="you@example.com"
              {...register('email', { required: t('Введите email') })}
            />
            {errors.email && <span style={{ color: '#e53e3e', fontSize: 13, marginTop: 4 }}>{errors.email.message}</span>}
          </label>

          <label className="field">
            <span>{t('Пароль')}</span>
            <input
              type="password"
              placeholder={t('Придумайте пароль')}
              {...register('password', { required: t('Введите пароль') })}
            />
            {errors.password && <span style={{ color: '#e53e3e', fontSize: 13, marginTop: 4 }}>{errors.password.message}</span>}
          </label>

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? t('Регистрация...') : t('Зарегистрироваться')}
          </button>
        </form>

        <div className="divider">
          <span>{t('или')}</span>
        </div>

        <Link to="/login" className="secondary-button auth-link-button">
          {t('Уже есть аккаунт? Войти')}
        </Link>

        {serverError && (
          <p className="form-status error" aria-live="polite">
            {serverError}
          </p>
        )}
      </div>
    </section>
  );
};