import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@dlz/prisma';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  tenantId?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Valida credenciais (usado pelo LocalStrategy) ─────────────────────────

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: true, tenant: true },
    });

    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    return user;
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(user: Awaited<ReturnType<typeof this.validateUser>>) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map((r: { role: string }) => r.role),
      tenantId: user.tenant?.id,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id);

    this.logger.log(`Login: ${user.email}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles.map((r: { role: string }) => r.role),
        tenantId: user.tenant?.id ?? null,
      },
    };
  }

  // ── Refresh token ─────────────────────────────────────────────────────────

  async refresh(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { roles: true, tenant: true } } },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    // Revoga o token atual (rotação)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.login(stored.user);
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(token: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  // ── Register (owner da plataforma / admin) ────────────────────────────────

  async register(email: string, password: string, displayName?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: { create: { displayName: displayName ?? email } },
        roles: { create: { role: 'user' } },
      },
      include: { roles: true, tenant: true },
    });

    return this.login(user);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async generateRefreshToken(userId: string) {
    const token = randomBytes(64).toString('hex');
    const expiresInDays = parseInt(
      this.config.get('JWT_REFRESH_EXPIRES_IN', '7d').replace('d', ''),
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      },
    });

    return token;
  }
}
