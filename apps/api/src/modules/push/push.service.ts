import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@dlz/prisma';
import webpush from 'web-push';
import type { SubscribePushDto, SendPushDto } from './push.dto';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue('push') private readonly queue: Queue,
  ) {
    const pub = config.get<string>('VAPID_PUBLIC_KEY', '');
    const priv = config.get<string>('VAPID_PRIVATE_KEY', '');
    const sub = config.get<string>('VAPID_SUBJECT', 'mailto:contato@dlz.app.br');
    if (pub && priv) webpush.setVapidDetails(sub, pub, priv);
  }

  async subscribe(tenantId: string, dto: SubscribePushDto) {
    return this.prisma.pushSubscription.upsert({
      where: { id: dto.endpoint.slice(-36) },
      create: {
        id: dto.endpoint.slice(-36),
        tenantId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent,
      },
      update: { p256dh: dto.keys.p256dh, auth: dto.keys.auth },
    });
  }

  async unsubscribe(endpoint: string, tenantId: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { endpoint, tenantId },
    });
  }

  async sendToTenant(tenantId: string, payload: SendPushDto) {
    const subs = await this.prisma.pushSubscription.findMany({ where: { tenantId } });
    for (const sub of subs) {
      await this.queue.add(
        'send',
        {
          sub: {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
          payload,
        },
        { attempts: 2 },
      );
    }
    return { queued: subs.length };
  }

  async sendDirect(
    sub: { endpoint: string; p256dh: string; auth: string },
    payload: SendPushDto,
  ) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: payload.icon,
          data: { url: payload.url },
        }),
      );
      return true;
    } catch (err: unknown) {
      const statusCode =
        typeof err === 'object' && err !== null && 'statusCode' in err
          ? Number((err as { statusCode?: number }).statusCode)
          : undefined;
      if (statusCode === 410 || statusCode === 404) {
        await this.prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Push failed: ${msg}`);
      return false;
    }
  }
}
