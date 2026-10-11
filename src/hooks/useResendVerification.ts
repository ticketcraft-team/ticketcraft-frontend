import { useState, useEffect } from 'react';
import { resendVerificationEmail } from '../api/auth';
import { useLanguage } from './useLanguage';

export const useResendVerification = () => {
  const { t } = useLanguage();
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async (email: string) => {
    if (cooldown > 0 || !email) return;
    
    setIsResending(true);
    setNotice(null);
    
    try {
      // Отправляем POST запрос с полем email
      await resendVerificationEmail(email);
    } catch (error) {
      console.error('Ошибка при повторной отправке', error);
    } finally {
      setIsResending(false);
      // Запускаем таймер на 60 секунд
      setCooldown(60);
      // Показываем нейтральное сообщение независимо от ответа (всегда 200 OK при валидном email)[cite: 5, 6]
      setNotice(
        t('Если аккаунт с указанным адресом существует и ожидает подтверждения, мы отправили письмо. Проверьте входящие и папку «Спам». Если вы уже активировали аккаунт, попробуйте войти.')
      );
    }
  };

  return { cooldown, notice, isResending, handleResend };
};