import { ApiProperty } from '@nestjs/swagger';

/** Subscription persistida (Web Push). */
export class PushSubscriptionPersistedResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ example: 'https://fcm.googleapis.com/fcm/send/...' })
  endpoint!: string;

  @ApiProperty()
  p256dh!: string;

  @ApiProperty()
  auth!: string;

  @ApiProperty({ required: false, nullable: true })
  userAgent!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

/** `POST /push/send` — jobs enfileirados. */
export class PushBroadcastQueuedResponseDto {
  @ApiProperty({ example: 12, description: 'Quantidade de subscriptions enfileiradas' })
  queued!: number;
}
