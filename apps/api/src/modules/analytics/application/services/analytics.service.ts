import { Injectable } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async trackEvent(tenantId: string, eventType: string, payload: Record<string, any>) {
    return this.prisma.analyticsEvent.create({
      data: { tenantId, eventType, payload },
    });
  }

  async getDashboard(tenantId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [ordersToday, ordersMonth, ordersLastMonth, revenueMonth, revenueLastMonth, pendingOrders] =
      await Promise.all([
        this.prisma.order.count({ where: { tenantId, createdAt: { gte: startOfDay } } }),
        this.prisma.order.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
        this.prisma.order.count({ where: { tenantId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
        this.prisma.order.aggregate({
          where: { tenantId, createdAt: { gte: startOfMonth } },
          _sum: { total: true },
        }),
        this.prisma.order.aggregate({
          where: { tenantId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
          _sum: { total: true },
        }),
        this.prisma.order.count({ where: { tenantId, status: 'pending' } }),
      ]);

    const revenueGrowth =
      Number(revenueLastMonth._sum.total ?? 0) > 0
        ? (
            ((Number(revenueMonth._sum.total ?? 0) - Number(revenueLastMonth._sum.total ?? 0)) /
              Number(revenueLastMonth._sum.total ?? 0)) *
            100
          ).toFixed(1)
        : null;

    return {
      ordersToday,
      ordersMonth,
      ordersLastMonth,
      revenueMonth: revenueMonth._sum.total ?? 0,
      revenueLastMonth: revenueLastMonth._sum.total ?? 0,
      revenueGrowth,
      pendingOrders,
    };
  }

  async getTopProducts(tenantId: string, limit = 10) {
    const orders = await this.prisma.order.findMany({
      where: { tenantId, status: { not: 'pending' } },
      select: { items: true },
    });

    const counts: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const order of orders) {
      const items = order.items as any[];
      for (const item of items) {
        const key = item.productId ?? item.name;
        if (!counts[key]) counts[key] = { name: item.name, qty: 0, revenue: 0 };
        counts[key].qty += item.quantity ?? 1;
        counts[key].revenue += (item.price ?? 0) * (item.quantity ?? 1);
      }
    }

    return Object.entries(counts)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, limit)
      .map(([id, v]) => ({ id, ...v }));
  }

  async getPeakHours(tenantId: string) {
    const orders = await this.prisma.order.findMany({
      where: { tenantId },
      select: { createdAt: true },
    });

    const hours: Record<number, number> = {};
    for (const o of orders) {
      const h = o.createdAt.getHours();
      hours[h] = (hours[h] ?? 0) + 1;
    }

    return Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hours[h] ?? 0 }));
  }

  async getPriceSuggestions(tenantId: string) {
    const topProducts = await this.getTopProducts(tenantId, 20);
    return topProducts.map((p) => ({
      productId: p.id,
      productName: p.name,
      totalSold: p.qty,
      revenue: p.revenue,
      suggestion:
        p.qty > 50
          ? { action: 'increase', pct: 5, reason: 'Alta demanda — pode aumentar 5% sem perder volume' }
          : p.qty < 5
            ? { action: 'decrease', pct: 10, reason: 'Baixa saída — reduza o preço ou promova o produto' }
            : { action: 'maintain', pct: 0, reason: 'Desempenho estável' },
    }));
  }

  async generateMonthlySnapshot(tenantId: string) {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [ordersData, newCustomers, topProducts] = await Promise.all([
      this.prisma.order.aggregate({
        where: { tenantId, createdAt: { gte: start, lte: end } },
        _count: { id: true },
        _sum: { total: true },
      }),
      this.prisma.customerProfile.count({
        where: { tenantId, createdAt: { gte: start, lte: end } },
      }),
      this.getTopProducts(tenantId, 5),
    ]);

    return this.prisma.monthlySnapshot.upsert({
      where: { tenantId_month: { tenantId, month } },
      create: {
        tenantId,
        month,
        totalOrders: ordersData._count.id,
        totalRevenue: ordersData._sum.total ?? 0,
        newCustomers,
        data: { topProducts },
      },
      update: {
        totalOrders: ordersData._count.id,
        totalRevenue: ordersData._sum.total ?? 0,
        newCustomers,
        data: { topProducts },
      },
    });
  }

  async getSnapshots(tenantId: string) {
    return this.prisma.monthlySnapshot.findMany({
      where: { tenantId },
      orderBy: { month: 'desc' },
      take: 12,
    });
  }
}
