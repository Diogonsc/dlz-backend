import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const APP_ROLES = ['admin', 'moderator', 'user', 'platform_owner'] as const;

export class UserProfileResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Maria Souza' })
  displayName?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'https://cdn.example.com/a.png' })
  avatarUrl?: string | null;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  updatedAt!: string;
}

export class UserRoleRowResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  userId!: string;

  @ApiProperty({ enum: APP_ROLES, example: 'user' })
  role!: string;
}

/** Tenant resumido no contexto do usuário autenticado. */
export class UserTenantSummaryResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Loja Demo' })
  name!: string;

  @ApiProperty({ example: 'starter' })
  plan!: string;

  @ApiProperty({ example: 'active' })
  status!: string;
}

/** GET /users/me — sem \`passwordHash\` (removido no serviço). */
export class UserMeResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'user@exemplo.com' })
  email!: string;

  @ApiPropertyOptional({ nullable: true, example: '+5511999999999' })
  phone?: string | null;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  updatedAt!: string;

  @ApiPropertyOptional({ type: UserProfileResponseDto })
  profile?: UserProfileResponseDto | null;

  @ApiProperty({ type: [UserRoleRowResponseDto] })
  roles!: UserRoleRowResponseDto[];

  @ApiPropertyOptional({ type: UserTenantSummaryResponseDto, nullable: true })
  tenant?: UserTenantSummaryResponseDto | null;
}
