import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@dlz/prisma';
import { ManageDomainAction } from '../../domain/types/manage-domain-action.type';

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async manage(tenantId: string, action: ManageDomainAction, domain: string) {
    const vercelToken = this.config.get<string>('VERCEL_TOKEN', '');
    const vercelProjectId = this.config.get<string>('VERCEL_PROJECT_ID', '');

    const normalized = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!normalized) throw new BadRequestException('Domínio inválido');

    const VERCEL_API = 'https://api.vercel.com';
    const headers = {
      Authorization: `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    };

    if (action === 'add') {
      if (!vercelToken || !vercelProjectId) {
        // Modo dev: apenas salva no banco
        await this.prisma.storeConfig.update({
          where: { tenantId },
          data: { customDomain: normalized },
        });
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: { domainStatus: 'pending' },
        });
        return { success: true, status: 'pending', devMode: true };
      }

      const res = await fetch(`${VERCEL_API}/v10/projects/${vercelProjectId}/domains`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: normalized }),
      });

      const data = (await res.json()) as any;
      if (!res.ok && data?.error?.code !== 'domain_already_in_use') {
        throw new BadRequestException(`Erro Vercel: ${data?.error?.message ?? res.status}`);
      }

      await this.prisma.storeConfig.update({ where: { tenantId }, data: { customDomain: normalized } });
      await this.prisma.tenant.update({ where: { id: tenantId }, data: { domainStatus: 'pending' } });

      return { success: true, status: 'pending', vercel: data };
    }

    if (action === 'remove') {
      if (vercelToken && vercelProjectId) {
        await fetch(`${VERCEL_API}/v9/projects/${vercelProjectId}/domains/${normalized}`, {
          method: 'DELETE',
          headers,
        });
      }
      await this.prisma.storeConfig.update({ where: { tenantId }, data: { customDomain: null } });
      await this.prisma.tenant.update({ where: { id: tenantId }, data: { domainStatus: 'none' } });
      return { success: true };
    }

    if (action === 'verify') {
      if (!vercelToken || !vercelProjectId) {
        return { success: true, verified: false, devMode: true };
      }

      const res = await fetch(`${VERCEL_API}/v9/projects/${vercelProjectId}/domains/${normalized}`, {
        headers,
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new BadRequestException(`Erro Vercel: ${data?.error?.message}`);

      const verified = data?.verified === true;
      const newStatus = verified ? 'active' : 'pending';

      await this.prisma.tenant.update({ where: { id: tenantId }, data: { domainStatus: newStatus } });

      return { success: true, verified, configuration: data?.verification };
    }

    throw new BadRequestException('Ação inválida');
  }

  async getStatus(tenantId: string) {
    const [tenant, storeConfig] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { subdomain: true, domainStatus: true } }),
      this.prisma.storeConfig.findUnique({ where: { tenantId }, select: { customDomain: true, slug: true } }),
    ]);

    return {
      subdomain: tenant?.subdomain,
      customDomain: storeConfig?.customDomain,
      domainStatus: tenant?.domainStatus ?? 'none',
      slug: storeConfig?.slug,
    };
  }
}
