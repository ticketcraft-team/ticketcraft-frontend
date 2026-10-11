import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPublicEventById, getEventSessions, type EventDetails } from '../../api/events';
import { useLanguage } from '../../hooks/useLanguage';

export const EventDetailPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      getPublicEventById(id),
      getEventSessions(id), // <--- Используем apiClient вместо сырого fetch
    ])
      .then(([eventData, sessionsData]) => {
        setEvent(eventData);
        setSessions(Array.isArray(sessionsData) ? sessionsData : sessionsData.content || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !event) {
    return (
      <div className="event-detail-page">
        <div className="event-detail-loading">
          <span className="event-detail-spinner" aria-hidden="true" />
          <p>{t('Загрузка...')}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="event-detail-page">
      <div className="event-detail-container">
        <section className="event-detail-hero" aria-labelledby="event-detail-title">
          <div className="event-detail-poster-frame">
            {event.posterUrl ? (
              <img src={event.posterUrl} alt={event.name} className="event-detail-poster" />
            ) : (
              <div className="event-detail-poster-empty">{t('Постер скоро появится')}</div>
            )}
          </div>

          <div className="event-detail-copy">
            <p className="event-detail-eyebrow">TicketCraft <span>·</span> {t('мероприятие')}</p>
            <div className="event-detail-facts">
              <span className="event-detail-age">{event.ageRating}</span>
              <span className="event-detail-duration">{event.durationMinutes}{t(' мин')}</span>
            </div>
            <h1 id="event-detail-title" className="event-detail-title">{event.name}</h1>
            <p className="event-detail-description">{event.description}</p>
          </div>
        </section>

        <section className="event-sessions" aria-labelledby="event-sessions-title">
          <div className="event-sessions-heading">
            <div>
              <p className="event-detail-eyebrow">{t('Расписание')}</p>
              <h2 id="event-sessions-title">{t('Выберите сеанс')}</h2>
            </div>
            {sessions.length > 0 && (
              <span className="event-sessions-count">{sessions.length} {t('сеансов')}</span>
            )}
          </div>

          {sessions.length === 0 ? (
            <p className="event-sessions-empty">{t('На ближайшее время сеансов не найдено.')}</p>
          ) : (
            <div className="event-sessions-grid">
              {sessions.map((sess) => {
                const date = new Date(sess.startTime);
                return (
                  <article key={sess.id} className="event-session-card">
                    <span className="event-session-hall">{sess.hallName || t('Зал 1')}</span>
                    <div className="event-session-date">
                      <span className="event-session-day">
                        {date.toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric' })}
                      </span>
                      <div className="event-session-time-wrap">
                        <span className="event-session-month">
                          {date.toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU', { month: 'long' })}
                        </span>
                        <span className="event-session-time">
                          {date.toLocaleTimeString(language === 'en' ? 'en-US' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/booking/session/${sess.id}`)}
                      className="event-session-button"
                    >
                      {t('Выбрать места')} <span aria-hidden="true">→</span>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};