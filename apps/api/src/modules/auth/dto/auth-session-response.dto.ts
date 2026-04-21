import { ApiProperty } from '@nestjs/swagger';

export class AuthUserSummaryDto {
  @ApiProperty({ example: '01HX...' })
  id!: string;

  @ApiProperty({ example: 'dono@minhaloja.com.br' })
  email!: string;

  @ApiProperty({ type: [String], example: ['user'] })
  roles!: string[];

  @ApiProperty({ nullable: true, example: '01HY...' })
  tenantId!: string | null;
}

/** Resposta de login, refresh e register (mesmo contrato). */
export class AuthSessionResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'a1b2c3d4...' })
  refreshToken!: string;

  @ApiProperty({ type: AuthUserSummaryDto })
  user!: AuthUserSummaryDto;
}
