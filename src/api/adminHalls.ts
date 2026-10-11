import { apiClient } from './client';

export interface CreateHallPayload {
  name: string;
  locationId: string | number; // Разрешаем строку, чтобы не терять точность int64
  description?: string;
  isVip: boolean;
}

export interface HallResponse {
  id: string;
  locationId: string;
  name: string;
  description?: string;
  isVip: boolean;
  totalSeats: number;
}

export interface BatchGenerateSeatsPayload {
  rowsCount: number;
  seatsPerRow: number;
  seatType: string;
  vipRowNumbers: number[];
}

export const getAdminHalls = async (locationId?: string | number): Promise<HallResponse[]> => {
  const response = await apiClient.get<HallResponse[]>('/api/v1/admin/halls', {
    params: locationId ? { locationId: String(locationId) } : undefined,
  });
  return response.data;
};

export const createAdminHall = async (data: CreateHallPayload): Promise<HallResponse> => {
  const response = await apiClient.post<HallResponse>('/api/v1/admin/halls', data);
  return response.data;
};

export const deleteAdminHall = async (
  hallId: string | number,
  reason: string = 'Удалено администратором'
): Promise<void> => {
  const cleanReason = typeof reason === 'string' ? reason : 'Удалено администратором';

  await apiClient.delete(`/api/v1/admin/halls/${hallId}`, {
    params: {
      reason: cleanReason,
    },
  });
};

export const batchGenerateSeats = async (
  hallId: string | number,
  data: BatchGenerateSeatsPayload
): Promise<void> => {
  await apiClient.post(`/api/v1/admin/halls/${hallId}/seats/batch-generate`, data);
};