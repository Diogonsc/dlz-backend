import { ApiProperty } from '@nestjs/swagger';

export class IfoodOAuthUrlResponseDto {
  @ApiProperty({ example: 'https://merchant-api.ifood.com.br/oauth/v1/oauth-code?...' })
  url!: string;
}

export class IfoodOAuthCallbackOkResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}

/** `GET /ifood/status` — `connected: false` quando não há credencial. */
export class IfoodIntegrationStatusResponseDto {
  @ApiProperty({ example: true })
  connected!: boolean;

  @ApiProperty({ required: false, example: '12345' })
  merchantId?: string;

  @ApiProperty({ required: false, nullable: true })
  tokenExpiresAt?: Date | null;

  @ApiProperty({ required: false, nullable: true, deprecated: true, description: 'Alias de tokenExpiresAt' })
  expiresAt?: Date | null;
}

export class IfoodDisconnectOkResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}

/** `POST /ifood/auth/refresh`, `/ifood/auth/test`, `/ifood/auth-action` */
export class IfoodAuthActionResultResponseDto {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty({ example: 'refresh', enum: ['refresh', 'test'] })
  action!: string;

  @ApiProperty({ required: false, example: 200 })
  statusCode?: number;
}

export class IfoodSyncOrderStatusResponseDto {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty({ required: false })
  skipped?: string;

  @ApiProperty({ required: false })
  error?: string;
}
