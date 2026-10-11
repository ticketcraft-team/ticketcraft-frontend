import { apiClient } from './client';

export interface Seat {
  sessionSeatId: number | string;
  rowNumber: number;
  seatNumber: number;
  seatType: 'STANDARD' | 'VIP' | 'LOVE_SEAT' | string; // добавить LOVE_SEAT или | string
  price: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | string;
}

export interface SessionSeatLayout {
  sessionId: number | string;
  eventId: number | string;
  eventName: string;
  hallId: number | string;
  seats: Seat[];
}

export interface HoldReservationPayload {
  sessionId: string | number;
  sessionSeatIds: (string | number)[];
}

export interface HoldReservationResponse {
  groupId: string;
  sessionSeatIds: (number | string)[];
  expiresAt: string;
}

// 1. Получить карту мест
export const getSessionSeats = async (sessionId: string | number): Promise<SessionSeatLayout> => {
  const response = await apiClient.get<SessionSeatLayout>(`/api/v1/sessions/${sessionId}/seats`);
  return response.data;
};

// 2. Удержать/забронировать выбранные места
export const holdReservation = async (payload: HoldReservationPayload): Promise<HoldReservationResponse> => {
  const response = await apiClient.post<HoldReservationResponse>('/api/v1/reservations/hold', payload);
  return response.data;
};

export interface CreateOrderPayload {
  groupId: string;
}

export const cancelOrder = async (orderId: string | number): Promise<void> => {
  await apiClient.post(`/api/v1/orders/${orderId}/cancel`);
};

export interface CreateOrderResponse {
  orderId: number | string;
  price: number;
  orderExpiresAt: string;
  secondsRemaining: number;
}

// Создание заказа на основе заблокированных мест
export const createOrderFromHold = async (payload: CreateOrderPayload): Promise<CreateOrderResponse> => {
  const response = await apiClient.post<CreateOrderResponse>('/api/v1/orders/create', payload);
  return response.data;
};

// Оформление возврата билетов (по массиву ticketCodes)
export const refundTickets = async (ticketCodes: string[]): Promise<void> => {
  await apiClient.post('/api/v1/tickets/refund', { ticketCodes });
};

