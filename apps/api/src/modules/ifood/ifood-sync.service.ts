// Adiciona endpoint POST /ifood/sync-order ao IfoodModule existente
// Este arquivo é um patch — o controller principal está em ifood.module.ts

import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';

// Mapeamento status DLZ → ações da API iFood
const STATUS_TO_IFOOD_ACTION: Record<string, string> = {
  preparing: 'confirm',
  delivery: 'dispatch',
  delivered: 'requestFinalization',
  cancelled: 'requestCancellation',
};

@Injectable()
export class IfoodSyncService {
  private readonly logger = new Logger(IfoodSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncOrderStatus(orderId: string, newStatus: string, userId: string): Promise<{ ok: boolean; skipped?: string; error?: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, tenantId: true, orderSource: true, ifoodOrderId: true, ifoodApiFlags: true },
    });

    if (!order) throw new NotFoundException('Pedido não encontrado');

    // Verifica ownership
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: order.tenantId, userId },
    });
    if (!tenant) throw new ForbiddenException('Sem permissão');

    // Só sincroniza pedidos iFood
    if (order.orderSource !== 'ifood' || !order.ifoodOrderId) {
      return { ok: true, skipped: 'not_ifood' };
    }

    const action = STATUS_TO_IFOOD_ACTION[newStatus];
    if (!action) {
      return { ok: true, skipped: `no_action_for_status_${newStatus}` };
    }

    // Verifica se já enviou esta ação (idempotência)
    const flags = (order.ifoodApiFlags as Record<string, boolean>) ?? {};
    if (flags[action]) {
      return { ok: true, skipped: `already_${action}` };
    }

    // Busca credenciais iFood do tenant
    const cred = await this.prisma.ifoodCredential.findUnique({
      where: { tenantId: order.tenantId },
    });

    if (!cred || !cred.enabled || !cred.accessToken) {
      return { ok: false, error: 'iFood não configurado ou sem token' };
    }

    // Verifica expiração do token
    if (cred.tokenExpiresAt && cred.tokenExpiresAt < new Date()) {
      return { ok: false, error: 'Token iFood expirado — acesse Configurações > iFood para renovar' };
    }

    try {
      const res = await fetch(
        `https://merchant-api.ifood.com.br/order/v1.0/orders/${order.ifoodOrderId}/${action}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cred.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`iFood ${action} failed: ${res.status} ${body}`);

        // Loga no banco
        await this.prisma.ifoodLog.create({
          data: {
            tenantId: order.tenantId,
            merchantId: cred.merchantId,
            eventType: `sync_${action}`,
            payload: { orderId, newStatus, ifoodOrderId: order.ifoodOrderId },
            status: 'error',
            errorMessage: `HTTP ${res.status}: ${body.slice(0, 500)}`,
            httpStatus: res.status,
          },
        });

        return { ok: false, error: `iFood retornou ${res.status}` };
      }

      // Marca flag de idempotência
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          ifoodApiFlags: { ...flags, [action]: true },
        },
      });

      // Log de sucesso
      await this.prisma.ifoodLog.create({
        data: {
          tenantId: order.tenantId,
          merchantId: cred.merchantId,
          eventType: `sync_${action}`,
          payload: { orderId, newStatus, ifoodOrderId: order.ifoodOrderId },
          status: 'success',
          httpStatus: res.status,
        },
      });

      this.logger.log(`iFood ${action} OK for order ${order.ifoodOrderId}`);
      return { ok: true };
    } catch (err: any) {
      this.logger.error(`iFood sync error: ${err.message}`);
      return { ok: false, error: err.message };
    }
  }
}
