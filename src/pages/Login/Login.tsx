import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { loginUser, type LoginPayload } from '../../api/auth';
import { useResendVerification } from '../../hooks/useResendVerification';
import { useLanguage } from '../../hooks/useLanguage';

export const Login: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Читаем параметр из URL, который присылает бэкенд
  const emailConfirmed = searchParams.get('emailConfirmed'); 

  const [serverError, setServerError] = useState<string | null>(null);
  const [isEmailUnverified, setIsEmailUnverified] = useState(false);

  const { cooldown, notice, isResending, handleResend } = useResendVerification();

  const { 
    register, 
    handleSubmit, 
    getValues, 
    formState: { errors, isSubmitting } 
  } = useForm<LoginPayload>();

  const onSubmit = async (data: LoginPayload) => {
    setServerError(null);
    setIsEmailUnverified(false);
    
    try {
      await loginUser(data);
      navigate('/profile');
    } catch (error: any) {
      const status = error.response?.status;
      const errorCode = error.response?.data?.code;

      if (status === 403 || errorCode === 'EMAIL_NOT_VERIFIED') {
        setIsEmailUnverified(true);
      } else {
        setServerError(error.response?.data?.message || 'Неверный email или пароль');
      }
    }
  };

  return (
    <section className="auth-layout">
      {/* Левая часть остается без изменений */}
      <div className="auth-hero">
        <div className="brand-row">
          <div className="brand-mark">TC</div>
          <span>TicketCraft</span>
        </div>
        <p className="eyebrow">{t('Добро пожаловать')}</p>
        <h1>{t('Войдите в свой аккаунт и продолжайте работу.')}</h1>
      </div>
      
      <div className="auth-card">
        <div className="card-header">
          <h2>{t('Вход')}</h2>
        </div>

        {/* Блоки уведомлений на основе параметров URL[cite: 7] */}
        {emailConfirmed === 'true' && (
          <div className="notice-banner" style={{ backgroundColor: '#f0fff4', color: '#2f855a', borderColor: '#c6f6d5', marginBottom: '20px' }}>
            <p><strong>{t('Успешно!')}</strong> {t('Почта подтверждена. Теперь вы можете войти в аккаунт.')}</p>
          </div>
        )}

        {emailConfirmed === 'false' && (
          <div className="notice-banner" style={{ backgroundColor: '#fff5f5', color: '#c53030', borderColor: '#fed7d7', marginBottom: '20px' }}>
            <p><strong>{t('Ошибка верификации.')}</strong> {t('Ссылка недействительна или устарела. Введите email и пароль ниже, чтобы запросить новую.')}</p>
          </div>
        )}

        {/* Универсальное уведомление из хука (о повторной отправке) */}
        {notice && (
          <div className="notice-banner" style={{ marginBottom: '20px' }}>
            <p>{notice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <label className="field">
            <span>{t('Email')}</span>
            <input 
              type="email" 
              placeholder="you@example.com"
              {...register('email', { required: t('Введите email') })} 
            />
            {/* Используем errors, чтобы исправить предупреждение ts(6133) */}
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </label>
          
          <label className="field">
            <span>{t('Пароль')}</span>
            <input 
              type="password" 
              placeholder={t('Введите пароль')}
              {...register('password', { required: t('Введите пароль') })} 
            />
            {errors.password && <span className="field-error">{errors.password.message}</span>}
          </label>

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? t('Входим...') : t('Войти')}
          </button>
        </form>

        {isEmailUnverified && (
          <div className="verification-alert">
            <p className="error-text">{t('Ваш email ещё не подтвержден')}</p>
            <button 
              type="button" 
              className="secondary-button"
              disabled={cooldown > 0 || isResending}
              onClick={() => handleResend(getValues('email'))}
            >
              {cooldown > 0 ? `${t('Отправить повторно')} (${cooldown}s)` : t('Отправить письмо ещё раз')}
            </button>
          </div>
        )}

        {serverError && <p className="form-status error">{serverError}</p>}

        <div className="divider">
          <span>{t('или')}</span>
        </div>

        {/* Используем Link, чтобы исправить предупреждение ts(6133)[cite: 8] */}
        <Link to="/register" className="secondary-button auth-link-button">
          {t('Создать аккаунт')}
        </Link>
      </div>
    </section>
  );
};