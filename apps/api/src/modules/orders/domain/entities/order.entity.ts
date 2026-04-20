import { isOrderPanelStatus, type OrderPanelStatus } from '../value-objects/order-status.vo';

/**
 * Agregado de pedido (regras em memória). Persistência continua no repositório.
 */
export class OrderEntity {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly status: string,
  ) {}

  static fromPersistence(row: { id: string; tenantId: string; status: string }): OrderEntity {
    return new OrderEntity(row.id, row.tenantId, row.status);
  }

  assertTenant(tenantId: string): void {
    if (this.tenantId !== tenantId) {
      throw new Error('ORDER_TENANT_MISMATCH');
    }
  }

  /** Total do pedido na vitrine: subtotal − desconto + taxa de entrega. */
  static calculateTotal(subtotal: number, discountAmount: number, deliveryFee: number): number {
    return subtotal - discountAmount + deliveryFee;
  }

  canBeCancelled(): boolean {
    return this.status === 'pending';
  }

  /** Transição de estado no painel (mantém compatibilidade: não impõe máquina estrita). */
  changeStatus(next: OrderPanelStatus): OrderEntity {
    if (!isOrderPanelStatus(next)) {
      throw new Error('INVALID_ORDER_STATUS');
    }
    return new OrderEntity(this.id, this.tenantId, next);
  }
}
