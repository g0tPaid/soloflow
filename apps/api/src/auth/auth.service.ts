import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

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
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const token = this.generateToken(user.id, user.email);
    return { user, token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.email);
    return {
      user: { id: user.id, email: user.email, name: user.name },
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
    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
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
