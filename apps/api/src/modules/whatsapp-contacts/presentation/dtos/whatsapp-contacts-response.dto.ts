import { ApiProperty } from '@nestjs/swagger';

export class WhatsappContactsListMetaDto {
  @ApiProperty({ example: 120 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 50 })
  limit!: number;
}

/** Linha de `whatsapp_contacts` (lista / detalhe mínimo). */
export class WhatsappContactRowDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  tenantId!: string;

  @ApiProperty({ example: '5511999999999' })
  phoneE164!: string;

  @ApiProperty({ example: true })
  optIn!: boolean;

  @ApiProperty({ example: false })
  optOut!: boolean;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z', nullable: true })
  lastInteraction!: Date | null;

  @ApiProperty({ example: null, nullable: true })
  blockedUntil!: Date | null;

  @ApiProperty({ example: 0 })
  consecutiveSendFailures!: number;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  updatedAt!: Date;
}

export class WhatsappContactsListResponseDto {
  @ApiProperty({ type: [WhatsappContactRowDto] })
  data!: WhatsappContactRowDto[];

  @ApiProperty({ type: WhatsappContactsListMetaDto })
  meta!: WhatsappContactsListMetaDto;
}

/** Linha de `whatsapp_messages`. */
export class WhatsappMessageRowDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ example: '5511999999999' })
  phoneE164!: string;

  @ApiProperty({ example: 'inbound' })
  direction!: string;

  @ApiProperty({ example: 'Olá', nullable: true })
  message!: string | null;

  @ApiProperty({ example: 'received' })
  status!: string;

  @ApiProperty({ example: 'twilio' })
  provider!: string;

  @ApiProperty({ nullable: true })
  messageSid!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true, example: {} })
  metadata!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;
}

export class WhatsappMessagesListResponseDto {
  @ApiProperty({ type: [WhatsappMessageRowDto] })
  data!: WhatsappMessageRowDto[];

  @ApiProperty({ type: WhatsappContactsListMetaDto })
  meta!: WhatsappContactsListMetaDto;
}

/** Resposta de `POST /whatsapp-contacts/send`. */
export class WhatsappSendMessageResponseDto {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty({ required: false, example: 'opt-out' })
  reason?: string;

  @ApiProperty({ required: false, example: true })
  queued?: boolean;
}
