import { apiClient } from './client';

export interface LocationAddress {
  country?: string;
  city?: string;
  street?: string;
  building?: string;
  zip?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  formatted?: string;
}

export interface CreateLocationPayload {
  name: string;
  address: LocationAddress;
}

export interface LocationResponse {
  id: number;
  name: string;
  address: LocationAddress;
}

// 1. Получение всех локаций
export const getAdminLocations = async (): Promise<LocationResponse[]> => {
  const response = await apiClient.get<LocationResponse[]>('/api/v1/admin/locations');
  return response.data;
};

// 2. Создание локации
export const createAdminLocation = async (data: CreateLocationPayload): Promise<LocationResponse> => {
  const response = await apiClient.post<LocationResponse>('/api/v1/admin/locations', data);
  return response.data;
};

// 3. Удаление локации
export const deleteAdminLocation = async (
  locationId: string | number,
  reason: string = 'Удалено администратором'
): Promise<void> => {
  const cleanReason = typeof reason === 'string' ? reason : 'Удалено администратором';

  await apiClient.delete(`/api/v1/admin/locations/${locationId}`, {
    params: {
      reason: cleanReason,
    },
  });
};