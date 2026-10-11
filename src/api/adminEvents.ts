import { apiClient } from './client';

export interface CreateEventPayload {
  name: string;
  description: string;
  ageRating: string;
  posterUrl: string;
  durationMinutes: number;
}

export interface EventItem {
  id: string | number;
  name: string;
  slug: string;
  description: string;
  ageRating: string;
  posterUrl: string;
  durationMinutes: number;
  activeSessionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedEventsResponse {
  content: EventItem[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isLast: boolean;
}

export interface GetEventsParams {
  search?: string;
  page?: number;
  size?: number;
  sort?: string[];
}

// 1. Получить список событий с пагинацией и поиском
export const getAdminEvents = async (params?: GetEventsParams): Promise<PaginatedEventsResponse> => {
  const response = await apiClient.get<PaginatedEventsResponse>('/api/v1/admin/events', {
    params: {
      search: params?.search || undefined,
      page: params?.page ?? 0,
      size: params?.size ?? 10,
      sort: params?.sort,
    },
  });
  return response.data;
};

// 2. Создать событие
export const createAdminEvent = async (data: CreateEventPayload): Promise<EventItem> => {
  const response = await apiClient.post<EventItem>('/api/v1/admin/events', data);
  return response.data;
};

export const deleteAdminEvent = async (
  eventId: string | number,
  reason: string = 'Удалено администратором'
): Promise<void> => {
  // Гарантируем, что reason — это всегда чистая строка, даже если туда передали объект события
  const cleanReason = typeof reason === 'string' ? reason : 'Удалено администратором';

  await apiClient.request({
    method: 'DELETE',
    url: `/api/v1/admin/events/${eventId}`,
    data: {
      reason: cleanReason,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });
};