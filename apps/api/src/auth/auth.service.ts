import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESET_IDENTIFIER_PREFIX = 'password-reset:';

function superAdminEmails(): Set<string> {
  const raw = process.env.SUPER_ADMIN_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  private async ensureSuperAdminFlag(userId: string, email: string) {
    if (!superAdminEmails().has(normalizeEmail(email))) return;
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

  /** Case-insensitive user lookup (Postgres). */
  private async findUserByEmail(email: string) {
    const normalized = normalizeEmail(email);
    return this.prisma.user.findFirst({
      where: {
        email: { equals: normalized, mode: 'insensitive' },
      },
    });
  }

  private appBaseUrl() {
    const raw =
      this.config.get<string>('APP_URL')?.trim() ||
      this.config.get<string>('WEB_URL')?.trim() ||
      this.config.get<string>('CORS_ORIGIN')?.trim() ||
      'http://localhost:3000';
    return raw.replace(/\/$/, '');
  }

  async register(dto: RegisterDto) {
    const email = normalizeEmail(dto.email);
    const existing = await this.findUserByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
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
    const email = normalizeEmail(dto.email);
    const user = await this.findUserByEmail(email);
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

    // Normalize stored email so future exact lookups stay consistent
    if (user.email !== email) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { email },
      });
    }

    await this.ensureSuperAdminFlag(user.id, email);
    await this.touchActive(user.id);

    const refreshed = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, isSuperAdmin: true },
    });

    const token = this.generateToken(user.id, email);
    return {
      user: refreshed!,
      token,
    };
  }

  /**
   * Always returns a generic success message (no email enumeration).
   * Sends a reset link when the account exists and has a password.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const email = normalizeEmail(dto.email);
    const generic = {
      message: 'If an account exists for that email, a reset link has been sent.',
    };

    try {
      const user = await this.findUserByEmail(email);
      if (!user?.passwordHash || user.suspendedAt) {
        return generic;
      }

      const identifier = `${RESET_IDENTIFIER_PREFIX}${email}`;
      await this.prisma.verificationToken.deleteMany({ where: { identifier } });

      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await this.prisma.verificationToken.create({
        data: {
          identifier,
          token: tokenHash,
          expires,
        },
      });

      const resetUrl = `${this.appBaseUrl()}/reset-password?token=${rawToken}`;
      const name = user.name?.trim() || 'there';

      await this.mail.send({
        to: email,
        subject: 'Reset your SoloFlow password',
        text: `Hi ${name},\n\nReset your SoloFlow password using this link (expires in 1 hour):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
        html: `
          <p>Hi ${name},</p>
          <p>Reset your SoloFlow password using the button below. This link expires in <strong>1 hour</strong>.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#DC2626;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a></p>
          <p style="color:#64748b;font-size:13px">Or copy this link:<br/>${resetUrl}</p>
          <p style="color:#64748b;font-size:13px">If you did not request this, you can ignore this email.</p>
        `,
      });
    } catch (error) {
      this.logger.error(
        `forgotPassword failed for ${email}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Still return generic message to the client
    }

    return generic;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = hashToken(dto.token.trim());
    const record = await this.prisma.verificationToken.findFirst({
      where: { token: tokenHash },
    });

    if (!record || record.expires.getTime() < Date.now()) {
      if (record) {
        await this.prisma.verificationToken.deleteMany({ where: { token: tokenHash } });
      }
      throw new BadRequestException('Reset link is invalid or has expired. Request a new one.');
    }

    if (!record.identifier.startsWith(RESET_IDENTIFIER_PREFIX)) {
      throw new BadRequestException('Reset link is invalid or has expired. Request a new one.');
    }

    const email = normalizeEmail(record.identifier.slice(RESET_IDENTIFIER_PREFIX.length));
    const user = await this.findUserByEmail(email);
    if (!user) {
      await this.prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } });
      throw new BadRequestException('Reset link is invalid or has expired. Request a new one.');
    }

    if (user.suspendedAt) {
      throw new ForbiddenException('Account suspended');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        email,
      },
    });

    await this.prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } });

    return { message: 'Password updated. You can sign in with your new password.' };
  }

  /** Single-user local mode — creates the owner account automatically. */
  async bootstrapLocal() {
    if (process.env.LOCAL_SINGLE_USER !== 'true') {
      throw new ForbiddenException('Local bootstrap is disabled');
    }

    const email = normalizeEmail(process.env.LOCAL_USER_EMAIL || 'owner@local');
    const name = process.env.LOCAL_USER_NAME || 'Owner';
    const password = process.env.LOCAL_USER_PASSWORD || 'soloflow';

    let user = await this.findUserByEmail(email);
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
    return this.jwt.sign({ sub: userId, email: normalizeEmail(email) });
  }
}
