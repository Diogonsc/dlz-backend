import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplicationContext } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, type RedisClientType } from 'redis';

/**
 * Adapter Redis para Socket.io — permite múltiplas instâncias da API partilharem rooms.
 * Ative com `REDIS_URL` (ex.: `redis://localhost:6379`) no ambiente.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private pubClient: RedisClientType | null = null;
  private subClient: RedisClientType | null = null;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(url: string): Promise<void> {
    this.pubClient = createClient({ url });
    this.subClient = this.pubClient.duplicate();
    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
  }

  async closeRedis(): Promise<void> {
    await Promise.all([
      this.pubClient?.quit().catch(() => undefined),
      this.subClient?.quit().catch(() => undefined),
    ]);
    this.pubClient = null;
    this.subClient = null;
    this.adapterConstructor = null;
  }

  override createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
