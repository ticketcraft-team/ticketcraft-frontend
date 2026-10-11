import { apiClient } from './client';

export interface PublicEvent {
  id: string;
  name: string;
  slug: string;
  description: string;
  ageRating: string;
  posterUrl: string;
  durationMinutes: number;
}

export interface PublicEventsResponse {
  content: PublicEvent[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isLast: boolean;
}

export interface EventDetails {
  id: string | number;
  name: string;
  slug?: string;
  description: string;
  ageRating: string;
  posterUrl: string;
  durationMinutes: number;
}

export interface GetEventsParams {
  search?: string;
  page?: number;
  size?: number;
  sort?: string[];
}

// 1. Получение публичного каталога мероприятий с фильтрацией и пагинацией
export const getPublicEvents = async (params: GetEventsParams = {}): Promise<PublicEventsResponse> => {
  const { search = '', page = 0, size = 12 } = params;

  const response = await apiClient.get('/api/v1/events', {
    params: {
      // Передаем пустую строку search, чтобы бэкенд вернул полный список без фильтрации
      search: search.trim(),
      page,
      size,
    },
  });

  const resData = response.data;

  if (Array.isArray(resData)) {
    return {
      content: resData,
      pageNumber: 0,
      pageSize: resData.length,
      totalElements: resData.length,
      totalPages: 1,
      isLast: true,
    };
  }

  return {
    content: resData?.content || resData?.items || resData?.data || [],
    pageNumber: resData?.pageNumber ?? resData?.number ?? 0,
    pageSize: resData?.pageSize ?? resData?.size ?? size,
    totalElements: resData?.totalElements ?? resData?.total ?? 0,
    totalPages: resData?.totalPages ?? 1,
    isLast: resData?.isLast ?? resData?.last ?? true,
  };

  
};

export const getPublicEventById = async (id: string | number): Promise<PublicEvent> => {
  const response = await apiClient.get<PublicEvent>(`/api/v1/events/${id}`);
  return response.data;
};

export const getEventSessions = async (eventId: string | number) => {
  const response = await apiClient.get(`/api/v1/sessions`, {
    params: { eventId },
  });
  return response.data;
};