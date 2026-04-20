import type { ConfigService } from '@nestjs/config';

export type EventBusMode = 'redis' | 'emitter' | 'dual';

export type EventBusConsumerTransport = 'inline' | 'bull';

export type EventBusSettings = {
  mode: EventBusMode;
  streamKey: string;
  streamKeys: {
    orders: string;
    billing: string;
    realtime: string;
    fallback: string;
  };
  groupName: string;
  consumerEnabled: boolean;
  dlqStreamKey: string;
  maxDeliveryAttempts: number;
  /** Tempo mínimo idle (ms) para XAUTOCLAIM recuperar pending de consumidor morto. */
  pendingClaimIdleMs: number;
  /** Máximo de mensagens por ciclo de XAUTOCLAIM. */
  pendingClaimBatch: number;
  consumerTransport: EventBusConsumerTransport;
  /** Em modo `bull`: esta instância executa o loop XREADGROUP e enfileira jobs. */
  streamReaderEnabled: boolean;
  /** Em modo `bull`: esta instância processa jobs Bull (pode ser um worker separado). */
  dispatchWorkerEnabled: boolean;
  /** Alerta se XLEN(stream) >= valor. */
  alertBacklogThreshold: number;
  /** Alerta se entrada XPENDING tiver idle >= valor (ms). */
  alertStuckPendingMs: number;
  /** Token Bearer opcional para POST replay DLQ (`Authorization: Bearer ...`). */
  adminToken: string;
};

const DEFAULTS: EventBusSettings = {
  mode: 'redis',
  streamKey: 'dlz:event-bus:domain',
  streamKeys: {
    orders: 'dlz:event-bus:orders',
    billing: 'dlz:event-bus:billing',
    realtime: 'dlz:event-bus:realtime',
    fallback: 'dlz:event-bus:domain',
  },
  groupName: 'dlz-domain-bus',
  consumerEnabled: true,
  dlqStreamKey: 'dlz:event-bus:dlq',
  maxDeliveryAttempts: 8,
  pendingClaimIdleMs: 60_000,
  pendingClaimBatch: 64,
  consumerTransport: 'inline',
  streamReaderEnabled: true,
  dispatchWorkerEnabled: true,
  alertBacklogThreshold: 5000,
  alertStuckPendingMs: 120_000,
  adminToken: '',
};

export function getEventBusSettings(config: ConfigService): EventBusSettings {
  const eb = config.get<Partial<EventBusSettings>>('eventBus');
  const base = eb?.streamKey ?? DEFAULTS.streamKey;
  const normalized = base.endsWith(':domain') ? base.slice(0, -':domain'.length) : base;
  return {
    mode: eb?.mode ?? DEFAULTS.mode,
    streamKey: base,
    streamKeys: {
      orders: eb?.streamKeys?.orders ?? `${normalized}:orders`,
      billing: eb?.streamKeys?.billing ?? `${normalized}:billing`,
      realtime: eb?.streamKeys?.realtime ?? `${normalized}:realtime`,
      fallback: eb?.streamKeys?.fallback ?? base,
    },
    groupName: eb?.groupName ?? DEFAULTS.groupName,
    consumerEnabled: eb?.consumerEnabled ?? DEFAULTS.consumerEnabled,
    dlqStreamKey: eb?.dlqStreamKey ?? DEFAULTS.dlqStreamKey,
    maxDeliveryAttempts: eb?.maxDeliveryAttempts ?? DEFAULTS.maxDeliveryAttempts,
    pendingClaimIdleMs: eb?.pendingClaimIdleMs ?? DEFAULTS.pendingClaimIdleMs,
    pendingClaimBatch: eb?.pendingClaimBatch ?? DEFAULTS.pendingClaimBatch,
    consumerTransport: eb?.consumerTransport ?? DEFAULTS.consumerTransport,
    streamReaderEnabled: eb?.streamReaderEnabled ?? DEFAULTS.streamReaderEnabled,
    dispatchWorkerEnabled: eb?.dispatchWorkerEnabled ?? DEFAULTS.dispatchWorkerEnabled,
    alertBacklogThreshold: eb?.alertBacklogThreshold ?? DEFAULTS.alertBacklogThreshold,
    alertStuckPendingMs: eb?.alertStuckPendingMs ?? DEFAULTS.alertStuckPendingMs,
    adminToken: eb?.adminToken ?? DEFAULTS.adminToken,
  };
}
