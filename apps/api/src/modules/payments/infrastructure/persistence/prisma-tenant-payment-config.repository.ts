import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';
import { TenantPaymentConfigRepositoryPort } from '../../domain/ports/tenant-payment-config.repository.port';

@Injectable()
export class PrismaTenantPaymentConfigRepository extends TenantPaymentConfigRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async hasMercadoPagoConfig(tenantId: string): Promise<boolean> {
    const count = await this.prisma.paymentGateway.count({
      where: {
        tenantId,
        provider: 'mercado_pago',
        isActive: true,
        accessToken: { not: '' },
        publicKey: { not: '' },
      },
    });
    return count > 0;
  }

  async findActiveMercadoPagoTenants(limit: number): Promise<string[]> {
    const rows: Array<{ tenantId: string }> = await this.prisma.paymentGateway.findMany({
      where: {
        provider: 'mercado_pago',
        isActive: true,
        accessToken: { not: '' },
      },
      orderBy: { updatedAt: 'desc' },
      select: { tenantId: true },
      take: limit,
    });
    return rows.map((row: { tenantId: string }) => row.tenantId);
  }

  async getMercadoPagoAccessToken(tenantId: string): Promise<string> {
    const row = await this.prisma.paymentGateway.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'mercado_pago' } },
      select: { accessToken: true, isActive: true },
    });

    if (!row?.isActive || !row.accessToken?.trim()) {
      throw new BadRequestException('MercadoPago não configurado para o tenant');
    }
    return row.accessToken.trim();
  }

  async getMercadoPagoWebhookSecret(tenantId: string): Promise<string> {
    const row = await this.prisma.paymentGateway.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'mercado_pago' } },
      select: { webhookSecret: true, isActive: true },
    });

    if (!row?.isActive || !row.webhookSecret?.trim()) {
      throw new BadRequestException('MercadoPago webhook secret não configurado para o tenant');
    }
    return row.webhookSecret.trim();
  }
}
