import { ApiProperty } from '@nestjs/swagger';

export class OtpSendResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiProperty({ example: 300 })
  expiresInSeconds!: number;

  @ApiProperty({
    required: false,
    description: 'Presente em ambientes de desenvolvimento / teste',
    example: '123456',
  })
  code?: string;
}

export class OtpVerifyResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiProperty({ example: '5511999999999' })
  phone!: string;
}
