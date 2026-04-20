import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Args de query com `where` opcional (extensão multitenant). */
type TenantScopedQueryArgs = {
  where?: Record<string, unknown>;
  [key: string]: unknown;
};

type TenantScopedQueryFn = (args: TenantScopedQueryArgs) => Promise<unknown>;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Conectado ao PostgreSQL via Prisma');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Desconectado do PostgreSQL');
  }

  /**
   * Filtra automaticamente por tenantId em todas as queries.
   * Usado como middleware global para isolamento multitenant.
   */
  forTenant(tenantId: string) {
    const mergeWhere = (args: TenantScopedQueryArgs): TenantScopedQueryArgs => ({
      ...args,
      where: { ...(args.where ?? {}), tenantId },
    });

    return this.$extends({
      query: {
        $allModels: {
          async findMany({
            args,
            query,
          }: {
            args: TenantScopedQueryArgs;
            query: TenantScopedQueryFn;
          }) {
            return query(mergeWhere(args));
          },
          async findFirst({
            args,
            query,
          }: {
            args: TenantScopedQueryArgs;
            query: TenantScopedQueryFn;
          }) {
            return query(mergeWhere(args));
          },
          async count({
            args,
            query,
          }: {
            args: TenantScopedQueryArgs;
            query: TenantScopedQueryFn;
          }) {
            return query(mergeWhere(args));
          },
        },
      },
    });
  }
}
