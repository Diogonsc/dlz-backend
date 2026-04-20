import { Module } from '@nestjs/common';
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '@dlz/prisma';
import { IsString } from 'class-validator';
import { normalizePhone } from '@dlz/shared';

// ── DTOs ─────────────────────────────────────────────────────────────────────

class SendOtpDto {
  @IsString() phone: string;
}

class VerifyOtpDto {
  @IsString() phone: string;
  @IsString() code: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_TTL_SECONDS = 300; // 5 minutos
  private readonly OTP_COOLDOWN_SECONDS = 60; // 1 minuto entre envios
  private readonly MAX_ATTEMPTS = 5;

  constructor(private readonly prisma: PrismaService) {}

  async send(phone: string): Promise<{ ok: boolean; expiresInSeconds: number; code?: string }> {
    const normalized = normalizePhone(phone);
    if (normalized.length < 10 || normalized.length > 15) {
      throw new BadRequestException('Telefone inválido');
    }

    // Verifica cooldown
    const recent = await this.prisma.otpCode.findFirst({
      where: {
        phoneNormalized: normalized,
        usedAt: null,
        createdAt: { gt: new Date(Date.now() - this.OTP_COOLDOWN_SECONDS * 1000) },
      },
    });
    if (recent) {
      const waitSecs = Math.ceil(
        this.OTP_COOLDOWN_SECONDS - (Date.now() - recent.createdAt.getTime()) / 1000,
      );
      throw new BadRequestException(`Aguarde ${waitSecs}s antes de solicitar novo código`);
    }

    // Invalida OTPs anteriores não usados
    await this.prisma.otpCode.updateMany({
      where: { phoneNormalized: normalized, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Gera novo OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + this.OTP_TTL_SECONDS * 1000);

    await this.prisma.otpCode.create({
      data: { phoneNormalized: normalized, code, expiresAt },
    });

    this.logger.log(`OTP criado para ${normalized}`);

    // Retorna o código diretamente (exibido na vitrine, sem SMS)
    return { ok: true, expiresInSeconds: this.OTP_TTL_SECONDS, code };
  }

  async verify(phone: string, code: string): Promise<{ ok: boolean; phone: string }> {
    const normalized = normalizePhone(phone);

    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phoneNormalized: normalized,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.code !== code) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    // Marca como usado
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    // Upsert de customer profile mínimo
    await this.prisma.customerProfile.upsert({
      where: { id: `00000000-0000-0000-0000-${normalized.padStart(12, '0')}`.slice(0, 36) },
      create: {
        tenantId: '00000000-0000-0000-0000-000000000000', // placeholder, atualiza no pedido
        phoneNormalized: normalized,
        phone: normalized,
        name: '',
      },
      update: {},
    }).catch(() => {}); // silencia erro de FK se tenant não existir

    return { ok: true, phone: normalized };
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

@ApiTags('otp')
@Controller('otp')
class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envia OTP por telefone (vitrine — autenticação do cliente)' })
  send(@Body() dto: SendOtpDto) {
    return this.otpService.send(dto.phone);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verifica código OTP' })
  verify(@Body() dto: VerifyOtpDto) {
    return this.otpService.verify(dto.phone, dto.code);
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

@Module({
  controllers: [OtpController],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
