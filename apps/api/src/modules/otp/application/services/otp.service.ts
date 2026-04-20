import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';
import { normalizePhone } from '@dlz/shared';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_TTL_SECONDS = 300;
  private readonly OTP_COOLDOWN_SECONDS = 60;

  constructor(private readonly prisma: PrismaService) {}

  async send(phone: string): Promise<{ ok: boolean; expiresInSeconds: number; code?: string }> {
    const normalized = normalizePhone(phone);
    if (normalized.length < 10 || normalized.length > 15) {
      throw new BadRequestException('Telefone inválido');
    }

    const recent = await this.prisma.otpCode.findFirst({
      where: {
        phoneNormalized: normalized,
        usedAt: null,
        createdAt: { gt: new Date(Date.now() - this.OTP_COOLDOWN_SECONDS * 1000) },
      },
    });
    if (recent) {
      const waitSecs = Math.ceil(this.OTP_COOLDOWN_SECONDS - (Date.now() - recent.createdAt.getTime()) / 1000);
      throw new BadRequestException(`Aguarde ${waitSecs}s antes de solicitar novo código`);
    }

    await this.prisma.otpCode.updateMany({
      where: { phoneNormalized: normalized, usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + this.OTP_TTL_SECONDS * 1000);

    await this.prisma.otpCode.create({
      data: { phoneNormalized: normalized, code, expiresAt },
    });

    this.logger.log(`OTP criado para ${normalized}`);
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

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    await this.prisma.customerProfile
      .upsert({
        where: { id: `00000000-0000-0000-0000-${normalized.padStart(12, '0')}`.slice(0, 36) },
        create: {
          tenantId: '00000000-0000-0000-0000-000000000000',
          phoneNormalized: normalized,
          phone: normalized,
          name: '',
        },
        update: {},
      })
      .catch(() => {});

    return { ok: true, phone: normalized };
  }
}
