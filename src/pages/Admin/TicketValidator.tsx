import React, { useState } from 'react';
import { apiClient } from '../../api/client';

interface ValidateResponse {
  ticketCode: string;
  checkedInAt: string;
  message: string;
}

export const TicketValidator: React.FC = () => {
  const [ticketCodeInput, setTicketCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationData, setValidationData] = useState<ValidateResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = ticketCodeInput.trim();
    if (!code) return;

    setLoading(true);
    setErrorMessage(null);
    setValidationData(null);

    try {
      const response = await apiClient.post<ValidateResponse>('/api/v1/tickets/validate', {
        ticketCode: code,
      });

      setValidationData(response.data);
      setTicketCodeInput('');
    } catch (err: any) {
      console.error('Ошибка гашения билета:', err);
      setErrorMessage(
        err.response?.data?.message || 'Билет не найден, не оплачен или уже был использован'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '580px', margin: '48px auto', padding: '0 20px', color: '#f8fafc' }}>
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '26px' }}>🎟️</span>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>
            Контроль билетов
          </h2>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
          Вставьте код билета для проверки и фиксации прохода посетителя.
        </p>

        <form onSubmit={handleValidate} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="Например: cba8de4d-aeae-4c72-..."
            value={ticketCodeInput}
            onChange={(e) => setTicketCodeInput(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              padding: '13px 16px',
              borderRadius: '12px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading || !ticketCodeInput.trim()}
            style={{
              padding: '13px 22px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              fontWeight: 700,
              borderRadius: '12px',
              border: 'none',
              cursor: loading || !ticketCodeInput.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !ticketCodeInput.trim() ? 0.6 : 1,
            }}
          >
            {loading ? 'Проверка...' : 'Погасить'}
          </button>
        </form>

        {/* Ошибка валидации */}
        {errorMessage && (
          <div
            style={{
              padding: '14px 18px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '12px',
              color: '#fca5a5',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '18px' }}>✕</span>
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Успешный проход */}
        {validationData && (
          <div
            style={{
              padding: '20px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid #10b981',
              borderRadius: '16px',
              color: '#6ee7b7',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>✓</span>
              <strong style={{ fontSize: '16px', color: '#34d399' }}>
                {validationData.message || 'Проход разрешён'}
              </strong>
            </div>

            <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
              <div>Код билета: <code style={{ color: '#f8fafc' }}>{validationData.ticketCode}</code></div>
              <div>
                Время отметки:{' '}
                <strong>
                  {new Date(validationData.checkedInAt).toLocaleString('ru-RU')}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};