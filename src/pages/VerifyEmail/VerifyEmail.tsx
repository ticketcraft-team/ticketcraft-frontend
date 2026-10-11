import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyEmail } from '../../api/auth';
import { useLanguage } from '../../hooks/useLanguage';

export const VerifyEmail: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    verifyEmail(token)
      .then(() => {
        setSuccess(true);
        // Даем 2 секунды прочитать сообщение и отправляем на страницу логина
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      })
      .catch((err: any) => {
        setError(
          err.response?.data?.message ||
          err.message ||
          t('Ссылка недействительна или срок её действия истёк.')
        );
      });
  }, [navigate, t]);

  return (
    <div className="verification-redirect" role="status" aria-live="polite" style={{ textAlign: 'center', marginTop: 60 }}>
      {error && (
        <div style={{ color: '#e53e3e' }}>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/login')}
            style={{ padding: '8px 16px', cursor: 'pointer', marginTop: 12 }}
          >
            {t('Перейти ко входу')}
          </button>
        </div>
      )}

      {!error && !success && (
        <p>{t('Подтверждаем почту...')}</p>
      )}

      {success && (
        <div style={{ color: '#38a169' }}>
          <h3>{t('Почта успешно подтверждена!')}</h3>
          <p>{t('Сейчас вы будете перенаправлены на страницу входа...')}</p>
        </div>
      )}
    </div>
  );
};