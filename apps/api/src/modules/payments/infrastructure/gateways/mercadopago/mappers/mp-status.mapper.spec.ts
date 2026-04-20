import { mapMercadoPagoStatus } from './mp-status.mapper';

describe('mapMercadoPagoStatus', () => {
  it('mapeia status conhecidos do MP para status internos', () => {
    expect(mapMercadoPagoStatus('approved')).toBe('approved');
    expect(mapMercadoPagoStatus('pending')).toBe('pending');
    expect(mapMercadoPagoStatus('rejected')).toBe('rejected');
    expect(mapMercadoPagoStatus('cancelled')).toBe('rejected');
    expect(mapMercadoPagoStatus('charged_back')).toBe('refunded');
    expect(mapMercadoPagoStatus('refunded')).toBe('refunded');
  });

  it('faz fallback para pending em status desconhecido', () => {
    expect(mapMercadoPagoStatus('in_process')).toBe('pending');
  });
});
