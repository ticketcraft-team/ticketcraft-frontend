import { apiClient } from './client';

export interface AnalyticsSummaryParams {
  from?: string;
  to?: string;
}

export interface AnalyticsSummaryResponse {
  periodFrom?: string;
  periodTo?: string;
  grossRevenue: number;
  refundedAmount: number;
  netRevenue: number;
  averageOrderValue: number;
  totalOrdersCreated: number;
  paidOrdersCount: number;
  refundedOrdersCount: number;
  expiredOrdersCount: number;
  cancelledOrdersCount: number;
  conversionRatePercent: number;
  cancellationRatePercent: number;
}

export const getAnalyticsSummary = async (
  params?: AnalyticsSummaryParams
): Promise<AnalyticsSummaryResponse> => {
  const response = await apiClient.get<AnalyticsSummaryResponse>(
    '/api/v1/admin/analytics/summary',
    { params }
  );
  return response.data;
};

export interface LocationAnalyticsItem {
  locationId: number | string;
  totalSessionsCount: number;
  totalOfferedSeats: number;
  soldSeatsCount: number;
  occupancyRatePercent: number;
  totalRevenue: number;
  revenueSharePercent: number;
}

export const getLocationsAnalytics = async (
  params?: AnalyticsSummaryParams
): Promise<LocationAnalyticsItem[]> => {
  const response = await apiClient.get<LocationAnalyticsItem[]>(
    '/api/v1/admin/analytics/locations',
    { params }
  );
  return response.data;
};

export interface SeatPerformanceItem {
  seatType: string;
  totalOfferedSeats: number | string;
  soldSeatsCount: number | string;
  occupancyRatePercent: number;
  revenue: number;
  revenueSharePercent: number;
}

export const getSeatsPerformanceAnalytics = async (
  params?: AnalyticsSummaryParams
): Promise<SeatPerformanceItem[]> => {
  const response = await apiClient.get<SeatPerformanceItem[]>(
    '/api/v1/admin/analytics/seats-performance',
    { params }
  );
  return response.data;
};

export const exportOrdersAnalytics = async (params?: AnalyticsSummaryParams): Promise<void> => {
  const response = await apiClient.get('/api/v1/admin/analytics/export/orders', {
    params,
    responseType: 'blob',
  });

  // Извлекаем имя файла из заголовка content-disposition или задаем дефолтное
  const disposition = response.headers['content-disposition'];
  let filename = 'orders_report.csv';
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match?.[1]) {
      filename = match[1].replace(/['"]/g, '');
    }
  }

  // Создаем ссылку на blob и инициируем скачивание
  const blob = new Blob([response.data]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};