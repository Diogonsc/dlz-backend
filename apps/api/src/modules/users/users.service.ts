import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, roles: true, tenant: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.sanitize(user);
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true, roles: true, tenant: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.sanitize(user);
  }

  async updateProfile(id: string, data: { displayName?: string; avatarUrl?: string }) {
    await this.prisma.profile.update({
      where: { userId: id },
      data,
    });
    return this.findById(id);
  }

  private sanitize(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
