import { apiClient } from './client';

export interface CreateSessionPayload {
  eventId: string | number;
  hallId: string | number;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  basePrice: number;
}

export interface SessionItem {
  id: string | number;
  eventId: string | number;
  eventName: string;
  hallId: string | number;
  hallName: string;
  startTime: string;
  endTime: string;
  status: 'AWAITING' | 'ACTIVE' | 'CANCELLED' | 'FINISHED' | string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedSessionsResponse {
  content: SessionItem[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isLast: boolean;
}

export interface GetSessionsParams {
  eventId?: string | number;
  hallId?: string | number;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

// 1. Получить сеансы с пагинацией и фильтрами
export const getAdminSessions = async (params?: GetSessionsParams): Promise<PaginatedSessionsResponse> => {
  const response = await apiClient.get<PaginatedSessionsResponse>('/api/v1/admin/sessions', {
    params: {
      eventId: params?.eventId || undefined,
      hallId: params?.hallId || undefined,
      status: params?.status || undefined,
      from: params?.from || undefined,
      to: params?.to || undefined,
      page: params?.page ?? 0,
      size: params?.size ?? 10,
    },
  });
  return response.data;
};

// 2. Создать сеанс
export const createAdminSession = async (data: CreateSessionPayload): Promise<SessionItem> => {
  const response = await apiClient.post<SessionItem>('/api/v1/admin/sessions', data);
  return response.data;
};

export interface CancelSessionPayload {
  reason: string;
}

// 3. Отменить сеанс с передачей JSON body
export const cancelAdminSession = async (
  sessionId: string | number, 
  reason: string = 'Отменено администратором'
): Promise<void> => {
  await apiClient.post(`/api/v1/admin/sessions/${sessionId}/cancel`, {
    reason,
  });
};