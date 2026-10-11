import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getPublicEvents } from '../../api/events';
import { useLanguage } from '../../hooks/useLanguage';

type DurationFilter = 'all' | 'short' | 'medium' | 'long';

export const EventsPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [ageFilter, setAgeFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all');
  const [page, setPage] = useState(0);
  const pageSize = 8;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-events', searchTerm, page],
    queryFn: () => getPublicEvents({ search: searchTerm.trim() || undefined, page, size: pageSize }),
    staleTime: 1000 * 60 * 2, // 2 минуты кэша
  });

  const events = data?.content ?? [];
  const ageRatings = Array.from(new Set(events.map((event) => event.ageRating).filter(Boolean)));
  const filteredEvents = events.filter((event) => {
    const matchesAge = ageFilter === 'all' || event.ageRating === ageFilter;
    const duration = event.durationMinutes;
    const matchesDuration =
      durationFilter === 'all' ||
      (durationFilter === 'short' && duration > 0 && duration <= 90) ||
      (durationFilter === 'medium' && duration > 90 && duration <= 120) ||
      (durationFilter === 'long' && duration > 120);

    return matchesAge && matchesDuration;
  });
  const hasActiveFilters = ageFilter !== 'all' || durationFilter !== 'all';

  return (
    <div className="events-page">
      <div className="events-container">
        {/* Заголовок и строка поиска */}
        <div className="events-heading">
          <div className="events-copy">
            <p className="events-eyebrow">TicketCraft <span>·</span> {t('выбор редакции')}</p>
            <h1 className="events-title">
              {t('Афиша мероприятий')}
            </h1>
            <p className="events-subtitle">
              {t('Выберите событие, зал и лучшие места для покупки билетов')}
            </p>
          </div>

          <div className="events-search-wrap">
            <input
              type="text"
              placeholder={t('Поиск событий...')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0); // сброс на первую страницу при вводе
              }}
              className="events-search"
              aria-label={t('Поиск мероприятий')}
            />
          </div>
        </div>

        <section className="events-filter-bar" aria-label={t('Фильтры мероприятий')}>
          <div className="events-filter-group">
            <label className="events-age-filter">
              <span>{t('Возраст')}</span>
              <select
                value={ageFilter}
                onChange={(event) => {
                  setAgeFilter(event.target.value);
                  setPage(0);
                }}
                className="events-select"
              >
                <option value="all">{t('Любой')}</option>
                {ageRatings.map((rating) => (
                  <option key={rating} value={rating}>{rating}</option>
                ))}
              </select>
            </label>

            <div className="events-duration-filter" role="group" aria-label={t('Длительность мероприятия')}>
              <span className="events-filter-label">{t('Длительность')}</span>
              <div className="events-duration-options">
                {([
                  ['all', t('Любая')],
                  ['short', t('До 90 мин')],
                  ['medium', t('90-120 мин')],
                  ['long', t('Больше 120 мин')],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`events-duration-option${durationFilter === value ? ' is-active' : ''}`}
                    aria-pressed={durationFilter === value}
                    onClick={() => {
                      setDurationFilter(value);
                      setPage(0);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="events-filter-summary" aria-live="polite">
            <span>{filteredEvents.length}{t(' из ')}{events.length}{t(' на странице')}</span>
            {hasActiveFilters && (
              <button
                type="button"
                className="events-clear-filters"
                onClick={() => {
                  setAgeFilter('all');
                  setDurationFilter('all');
                  setPage(0);
                }}
              >
                {t('Сбросить')}
              </button>
            )}
          </div>
        </section>

        {/* Индикатор загрузки */}
        {isLoading && (
          <div className="events-message events-loading">
            {t('Загрузка мероприятий...')}
          </div>
        )}

        {/* Ошибка */}
        {isError && (
          <div className="events-message events-error">
            {t('Не удалось загрузить список мероприятий. Попробуйте обновить страницу.')}
          </div>
        )}

        {/* Пустой список */}
        {!isLoading && !isError && events.length === 0 && (
          <div className="events-message events-empty">
            <p className="events-empty-title">{t('Мероприятий не найдено')}</p>
            <p>{t('Попробуйте изменить поисковый запрос')}</p>
          </div>
        )}

        {!isLoading && !isError && events.length > 0 && filteredEvents.length === 0 && (
          <div className="events-message events-empty">
            <p className="events-empty-title">{t('Подходящих мероприятий нет')}</p>
            <p>{t('Измените фильтры или сбросьте их')}</p>
          </div>
        )}

        {/* Сетка событий */}
        {!isLoading && !isError && filteredEvents.length > 0 && (
          <div className="events-grid">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => navigate(`/events/${event.id}`)}
                className="event-card"
              >
                {/* Постер */}
                <div className="event-poster-wrap">
                  {event.posterUrl ? (
                    <img
                      src={event.posterUrl}
                      alt={event.name}
                      className="event-poster"
                    />
                  ) : (
                    <div className="event-no-poster">
                      {t('Нет изображения')}
                    </div>
                  )}
                  {event.ageRating && (
                    <span className="event-age-rating">
                      {event.ageRating}
                    </span>
                  )}
                </div>

                {/* Информация */}
                <div className="event-info">
                  <div>
                    <h3 className="event-title">
                      {event.name}
                    </h3>
                    <p className="event-description">
                      {event.description || t('Описание отсутствует')}
                    </p>
                  </div>

                  <div className="event-meta">
                    <span className="event-duration">{event.durationMinutes ? `${event.durationMinutes}${t(' мин')}` : t('Длительность не указана')}</span>
                    <span className="event-cta">
                      {t('Купить билет →')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Пагинация */}
        {data && data.totalPages > 1 && (
          <div className="events-pagination">
            <button
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              disabled={page === 0}
              className="events-page-button"
            >
              {t('← Назад')}
            </button>
            <span className="events-page-count">
              {t('Страница ')}{page + 1}{t(' из ')}{data.totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => (!data.isLast ? prev + 1 : prev))}
              disabled={data.isLast}
              className="events-page-button"
            >
              {t('Вперёд →')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};