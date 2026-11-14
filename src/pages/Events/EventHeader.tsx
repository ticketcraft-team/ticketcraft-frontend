import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';

export const EventHeader = () => {
  const { t } = useLanguage();
  const hasAccessToken = Boolean(Cookies.get('accessToken'));
  const [isVisible, setIsVisible] = useState(() => window.scrollY <= 120);
  const [isScrolled, setIsScrolled] = useState(() => window.scrollY > 12);

  useEffect(() => {
    let previousScrollY = window.scrollY;

    const updateHeader = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 12);

      if (currentScrollY <= 120) {
        setIsVisible(true);
      } else if (Math.abs(currentScrollY - previousScrollY) > 5) {
        setIsVisible(currentScrollY < previousScrollY);
        previousScrollY = currentScrollY;
        return;
      }

      previousScrollY = currentScrollY;
    };

    window.addEventListener('scroll', updateHeader, { passive: true });
    return () => window.removeEventListener('scroll', updateHeader);
  }, []);

  return (
    <>
      <header
        className={`event-detail-header${isVisible ? ' is-visible' : ''}${isScrolled ? ' is-scrolled' : ''}`}
        aria-hidden={!isVisible}
        inert={!isVisible}
      >
        <div className="event-detail-header-content">
          <Link to="/" className="event-detail-brand" aria-label="TicketCraft" tabIndex={isVisible ? 0 : -1}>
            <span className="event-detail-brand-mark" aria-hidden="true">TC</span>
            <span>TicketCraft</span>
          </Link>
          <div className="event-header-animation" aria-hidden="true">
            <span className="event-header-orbit" />
            <span className="event-header-star">✦</span>
            <span className="event-header-spark event-header-spark-left">✦</span>
            <span className="event-header-spark event-header-spark-right">✦</span>
          </div>
          <nav className="event-detail-navigation" aria-label={t('Основная навигация')}>
            <Link
              to={hasAccessToken ? '/profile' : '/login'}
              className="event-detail-nav-account"
              tabIndex={isVisible ? 0 : -1}
            >
              {hasAccessToken ? t('Профиль') : t('Войти')}
            </Link>
          </nav>
        </div>
      </header>
      <div className="event-detail-header-spacer" aria-hidden="true" />
    </>
  );
};
