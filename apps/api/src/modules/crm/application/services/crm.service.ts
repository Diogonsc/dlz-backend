import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, opts: { segment?: string; search?: string; page: number; limit: number }) {
    const where: any = { tenantId };
    if (opts.segment) where.segment = opts.segment;
    if (opts.search) {
      where.OR = [
        { name: { contains: opts.search, mode: 'insensitive' } },
        { phone: { contains: opts.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customerProfile.findMany({
        where,
        orderBy: { totalSpent: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.customerProfile.count({ where }),
    ]);

    return { data, meta: { total, page: opts.page, limit: opts.limit, totalPages: Math.ceil(total / opts.limit) } };
  }

  async findOne(id: string, tenantId: string) {
    const profile = await this.prisma.customerProfile.findFirst({
      where: { id, tenantId },
    });
    if (!profile) throw new NotFoundException('Cliente não encontrado');

    const orders = await this.prisma.order.findMany({
      where: { tenantId, customerPhone: profile.phoneNormalized },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { orderCode: true, status: true, total: true, createdAt: true },
    });

    return { ...profile, orders };
  }

  async getMetrics(tenantId: string) {
    const [total, newCustomers, recurring, topSpenders] = await Promise.all([
      this.prisma.customerProfile.count({ where: { tenantId } }),
      this.prisma.customerProfile.count({ where: { tenantId, segment: 'new' } }),
      this.prisma.customerProfile.count({ where: { tenantId, segment: { in: ['recurring', 'loyal'] } } }),
      this.prisma.customerProfile.findMany({
        where: { tenantId },
        orderBy: { totalSpent: 'desc' },
        take: 5,
        select: { name: true, totalSpent: true, totalOrders: true },
      }),
    ]);

    const avgTicket = await this.prisma.customerProfile.aggregate({
      where: { tenantId },
      _avg: { totalSpent: true },
    });

    return { total, newCustomers, recurring, topSpenders, avgTicket: avgTicket._avg.totalSpent ?? 0 };
  }

  async resegment(tenantId: string) {
    const customers = await this.prisma.customerProfile.findMany({ where: { tenantId } });
    const now = new Date();

    for (const c of customers) {
      let segment = 'new';
      if (c.totalOrders >= 10) segment = 'loyal';
      else if (c.totalOrders >= 3) segment = 'recurring';
      else if (c.lastOrderAt) {
        const daysSince = (now.getTime() - c.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 60) segment = 'lost';
        else if (daysSince > 30) segment = 'inactive';
        else if (daysSince > 14) segment = 'at_risk';
      }

      if (segment !== c.segment) {
        await this.prisma.customerProfile.update({ where: { id: c.id }, data: { segment } });
      }
    }

    return { resegmented: customers.length };
  }
}
