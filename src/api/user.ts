import { apiClient } from './client';

export interface UserProfileResponse {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  roles: string[];
  createdAt: string;
}

export type OrderStatus =
  | 'CREATED'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'REFUND_FAILED'
  | 'PARTIALLY_REFUNDED'
  | 'EXPIRED'
  | 'TERMINATED';

export interface GetOrdersParams {
  statuses?: OrderStatus[];
  page?: number;
  size?: number;
  sort?: string[];
}

// Получение профиля
export const getMyProfile = async (): Promise<UserProfileResponse> => {
  const response = await apiClient.get<UserProfileResponse>('/api/v1/users/me');
  return response.data;
};

// Получение активных билетов
export const getMyActiveTickets = async (): Promise<any[]> => {
  const response = await apiClient.get('/api/v1/users/me/tickets/active');
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data?.content || [];
};

// Получение истории заказов
export const getMyOrders = async (params?: GetOrdersParams): Promise<any[]> => {
  const allStatuses: OrderStatus[] = [
    'CREATED',
    'PENDING_PAYMENT',
    'PAID',
    'CANCELLED',
    'REFUND_PENDING',
    'REFUNDED',
    'REFUND_FAILED',
    'PARTIALLY_REFUNDED',
    'EXPIRED',
    'TERMINATED',
  ];

  const response = await apiClient.get('/api/v1/users/me/orders', {
    params: {
      page: params?.page ?? 0,
      size: params?.size ?? 10,
      statuses: params?.statuses && params.statuses.length > 0 ? params.statuses : allStatuses,
      sort: params?.sort,
    },
    paramsSerializer: {
      indexes: null,
    },
  });

  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data?.content || [];
};

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// Изменение пароля (POST /api/v1/users/me/change-password)
export const changePassword = async (data: ChangePasswordPayload): Promise<void> => {
  await apiClient.post('/api/v1/users/me/change-password', data);
};

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

// Обновление данных профиля (PATCH /api/v1/users/me)
export const updateMyProfile = async (data: UpdateProfilePayload): Promise<UserProfileResponse> => {
  const response = await apiClient.patch<UserProfileResponse>('/api/v1/users/me', data);
  return response.data;
};