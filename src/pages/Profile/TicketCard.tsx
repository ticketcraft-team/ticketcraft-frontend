import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';

export interface TicketItem {
  id?: number | string;
  ticketId?: string | number;
  ticketCode?: string;
  code?: string;
  orderId?: string | number;
  eventName?: string;
  sessionStartTime?: string;
  startTime?: string;
  hallName?: string;
  rowNumber?: number;
  seatNumber?: number;
  price?: number;
  totalAmount?: number;
  seatPrice?: number;
  ticketPrice?: number;
  amount?: number;
  seatType?: string;
  status?: string;
}

interface TicketCardProps {
  ticket: TicketItem;
  onDownloadPdf?: (ticketCode: string) => void;
  onRefundTicket?: (ticketCode: string) => void;
  isRefunding?: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({ 
  ticket, 
  onDownloadPdf, 
  onRefundTicket,
  isRefunding = false 
}) => {
  const { t, language } = useLanguage();
  const code = ticket.ticketCode || ticket.code || String(ticket.id || ticket.ticketId || 'TC-000000');
  const dateStr = ticket.sessionStartTime || ticket.startTime;
  const formattedDate = dateStr
    ? new Date(dateStr).toLocaleString(language === 'en' ? 'en-US' : 'ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : t('Дата не указана');

  const displayPrice =
    ticket.price ??
    ticket.totalAmount ??
    ticket.seatPrice ??
    ticket.ticketPrice ??
    ticket.amount ??
    0;

  const isIssued = ticket.status === 'ISSUED';

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    alert(t('Код билета скопирован в буфер обмена!'));
  };

  return (
    <article className="ticket-card">
      <div className="ticket-card-main">
        <div>
          <div className="ticket-card-topline">
            <span className="ticket-card-type">
              {ticket.seatType || t('Электронный билет')}
            </span>
            <span 
              className="ticket-card-code" 
              title={t('Нажмите, чтобы скопировать полный код')}
              style={{ cursor: 'pointer' }}
              onClick={handleCopy}
            >
              № {code} 📋
            </span>
          </div>

          <h3 className="ticket-card-title">
            {ticket.eventName || t('Событие TicketCraft')}
          </h3>

          <div className="ticket-card-details">
            <div>
              <span className="ticket-card-label">{t('Дата и время')}</span>
              <strong>{formattedDate}</strong>
            </div>
            <div>
              <span className="ticket-card-label">{t('Зал')}</span>
              <strong>{ticket.hallName || t('Основной зал')}</strong>
            </div>
            <div>
              <span className="ticket-card-label">{t('Место')}</span>
              <strong className="ticket-card-seat">
                {t('Ряд')} {ticket.rowNumber ?? '—'}, {t('Место')} {ticket.seatNumber ?? '—'}
              </strong>
            </div>
          </div>
        </div>

        <div className="ticket-card-footer">
          <div>
            <span className="ticket-card-label">{t('Стоимость')}</span>
            <strong className="ticket-card-price">{displayPrice} $</strong>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onDownloadPdf && (
              <button
                type="button"
                onClick={() => onDownloadPdf(code)}
                className="ticket-card-download"
              >
                <span aria-hidden="true">↓</span> {t('Скачать PDF')}
              </button>
            )}

            {onRefundTicket && isIssued && (
              <button
                type="button"
                disabled={isRefunding}
                onClick={() => {
                  if (confirm(t('Вы уверены, что хотите оформить возврат этого билета?'))) {
                    onRefundTicket(code);
                  }
                }}
                style={{
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#f87171',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  cursor: isRefunding ? 'not-allowed' : 'pointer',
                  opacity: isRefunding ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {isRefunding ? t('Возврат...') : t('Вернуть билет')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="ticket-card-perforation" aria-hidden="true">
        <span />
      </div>

      <div className="ticket-card-stub">
        <div className="ticket-card-barcode" aria-hidden="true">
          <span /><span /><span /><span /><span /><span />
          <span /><span /><span /><span /><span /><span />
        </div>
        <span 
          className="ticket-card-stub-code"
          title={t('Нажмите, чтобы скопировать')}
          style={{ cursor: 'pointer' }}
          onClick={handleCopy}
        >
          {code.slice(0, 18)}…
        </span>
        <span className="ticket-card-entry">
          {t('Контроль на входе')}
        </span>
      </div>
    </article>
  );
};