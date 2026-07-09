import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

function superAdminEmails(): Set<string> {
  const raw = process.env.SUPER_ADMIN_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private async ensureSuperAdminFlag(userId: string, email: string) {
    if (!superAdminEmails().has(email.toLowerCase())) return;
    await this.prisma.user.update({
      where: { id: userId },
      data: { isSuperAdmin: true },
    });
  }

  private async touchActive(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    });
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        lastActiveAt: new Date(),
      },
      select: { id: true, email: true, name: true, createdAt: true, isSuperAdmin: true },
    });

    await this.ensureSuperAdminFlag(user.id, user.email);
    const refreshed = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, createdAt: true, isSuperAdmin: true },
    });

    const token = this.generateToken(user.id, user.email);
    return { user: refreshed!, token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.suspendedAt) {
      throw new ForbiddenException('Account suspended');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.ensureSuperAdminFlag(user.id, user.email);
    await this.touchActive(user.id);

    const refreshed = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, isSuperAdmin: true },
    });

    const token = this.generateToken(user.id, user.email);
    return {
      user: refreshed!,
      token,
    };
  }
  /** Single-user local mode — creates the owner account automatically. */
  async bootstrapLocal() {
    if (process.env.LOCAL_SINGLE_USER !== 'true') {
      throw new ForbiddenException('Local bootstrap is disabled');
    }

    const email = process.env.LOCAL_USER_EMAIL || 'owner@local';
    const name = process.env.LOCAL_USER_NAME || 'Owner';
    const password = process.env.LOCAL_USER_PASSWORD || 'soloflow';

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 12);
      user = await this.prisma.user.create({
        data: { email, name, passwordHash },
      });
    }

    const token = this.generateToken(user.id, user.email);
    await this.ensureSuperAdminFlag(user.id, user.email);
    await this.touchActive(user.id);
    const refreshed = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, isSuperAdmin: true },
    });
    return {
      user: refreshed!,
      token,
    };
  }

  async getProfile(userId: string) {
    await this.touchActive(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
        isSuperAdmin: true,
        suspendedAt: true,
        lastActiveAt: true,
        memberships: {
          include: {
            organization: { select: { id: true, name: true, slug: true, logo: true } },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
  private generateToken(userId: string, email: string) {
    return this.jwt.sign({ sub: userId, email });
  }
}
