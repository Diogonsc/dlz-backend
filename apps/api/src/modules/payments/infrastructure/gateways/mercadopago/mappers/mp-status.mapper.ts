import type { GetPaymentOutput } from '../../../../domain/ports/payment-gateway.port';

const MP_STATUS_MAP: Record<string, GetPaymentOutput['status']> = {
  approved: 'approved',
  pending: 'pending',
  rejected: 'rejected',
  cancelled: 'rejected',
  canceled: 'rejected',
  refunded: 'refunded',
  charged_back: 'refunded',
};

export function mapMercadoPagoStatus(rawStatus: string): GetPaymentOutput['status'] {
  return MP_STATUS_MAP[rawStatus] ?? 'pending';
}
