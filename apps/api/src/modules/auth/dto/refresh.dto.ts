import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'dono@minhaloja.com.br' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'dono@minhaloja.com.br' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'João Silva', required: false })
  @IsString()
  displayName?: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
