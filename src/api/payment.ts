import { apiClient } from './client';

export type PaymentProvider = 'LIQPAY' | string;

export interface InitiatePaymentPayload {
  orderId: number | string;
  provider: PaymentProvider;
  idempotencyKey: string;
}

export interface InitiatePaymentResponse {
  paymentUrl?: string;
  data?: string;
  signature?: string;
  status?: string;
  [key: string]: any;
}

export const initiatePayment = async (
  payload: InitiatePaymentPayload
): Promise<InitiatePaymentResponse> => {
  const response = await apiClient.post<InitiatePaymentResponse>(
    '/api/v1/payments/initiate',
    payload
  );
  return response.data;
};