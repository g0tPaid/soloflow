import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { MemberRole } from '@flowbooks/database';
import { DEFAULT_MEMBER_SOFT_LIMIT, ROLE_LABELS } from '@flowbooks/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto/member.dto';

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const INVITABLE_ROLES = new Set<MemberRole>([
  MemberRole.ADMIN,
  MemberRole.MANAGER,
  MemberRole.ACCOUNTANT,
  MemberRole.SALES,
  MemberRole.EMPLOYEE,
  MemberRole.CUSTOM,
]);

const MEMBER_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
} as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function roleLabel(role: MemberRole) {
  return ROLE_LABELS[role] ?? role;
}

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  private appBaseUrl() {
    const raw =
      this.config.get<string>('APP_URL')?.trim() ||
      this.config.get<string>('WEB_URL')?.trim() ||
      this.config.get<string>('CORS_ORIGIN')?.trim() ||
      'http://localhost:3000';
    return raw.replace(/\/$/, '');
  }

  private seatLimit() {
    const raw = Number(this.config.get<string>('ORG_MEMBER_SOFT_LIMIT'));
    if (Number.isFinite(raw) && raw >= 25) return Math.floor(raw);
    return DEFAULT_MEMBER_SOFT_LIMIT;
  }

  private async requireMember(orgId: string, userId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }
    return membership;
  }

  private async requireManager(orgId: string, userId: string) {
    const membership = await this.requireMember(orgId, userId);
    if (membership.role !== MemberRole.OWNER && membership.role !== MemberRole.ADMIN) {
      throw new ForbiddenException('Only owners and admins can manage team members');
    }
    return membership;
  }

  private async findInviteByRawToken(rawToken: string) {
    const tokenHash = hashToken(rawToken.trim());
    const invite = await this.prisma.organizationInvite.findUnique({
      where: { tokenHash },
      include: {
        organization: { select: { id: true, name: true } },
        invitedBy: { select: { name: true, email: true } },
      },
    });
    if (!invite || invite.expiresAt.getTime() < Date.now()) {
      if (invite) {
        await this.prisma.organizationInvite.deleteMany({ where: { id: invite.id } });
      }
      throw new BadRequestException('Invite link is invalid or has expired.');
    }
    return invite;
  }

  async list(userId: string, orgId: string) {
    await this.requireMember(orgId, userId);

    const [members, pendingInvites] = await Promise.all([
      this.prisma.organizationMember.findMany({
        where: { organizationId: orgId },
        include: MEMBER_INCLUDE,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.organizationInvite.findMany({
        where: { organizationId: orgId, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
    ]);

    const roleRank: Record<string, number> = {
      OWNER: 0,
      ADMIN: 1,
      MANAGER: 2,
      ACCOUNTANT: 3,
      SALES: 4,
      EMPLOYEE: 5,
      CUSTOM: 6,
    };
    members.sort((a, b) => (roleRank[a.role] ?? 9) - (roleRank[b.role] ?? 9));

    const seatLimit = this.seatLimit();
    return {
      members,
      pendingInvites,
      seatLimit,
      seatCount: members.length + pendingInvites.length,
    };
  }

  async invite(actorId: string, orgId: string, dto: InviteMemberDto) {
    const actor = await this.requireManager(orgId, actorId);
    const email = normalizeEmail(dto.email);
    const role = dto.role as MemberRole;

    if (!INVITABLE_ROLES.has(role) || role === MemberRole.OWNER) {
      throw new BadRequestException('Cannot assign that role');
    }
    if (role === MemberRole.ADMIN && actor.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Only owners can invite admins');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const existingMember = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        user: { email: { equals: email, mode: 'insensitive' } },
      },
    });
    if (existingMember) {
      throw new ConflictException('That email is already a member of this organization');
    }

    const [memberCount, pendingCount] = await Promise.all([
      this.prisma.organizationMember.count({ where: { organizationId: orgId } }),
      this.prisma.organizationInvite.count({
        where: { organizationId: orgId, expiresAt: { gt: new Date() } },
      }),
    ]);
    const seatLimit = this.seatLimit();
    if (memberCount + pendingCount >= seatLimit) {
      throw new BadRequestException(
        `This organization has reached its team limit of ${seatLimit} people.`,
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    const actorUser = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true, email: true },
    });
    const inviterName = actorUser?.name?.trim() || actorUser?.email || 'A teammate';
    const displayName = dto.name?.trim() || undefined;

    if (existingUser) {
      const member = await this.prisma.organizationMember.create({
        data: {
          organizationId: orgId,
          userId: existingUser.id,
          role,
          invitedAt: new Date(),
          joinedAt: new Date(),
        },
        include: MEMBER_INCLUDE,
      });
      await this.prisma.organizationInvite.deleteMany({
        where: { organizationId: orgId, email },
      });
      const emailDelivered = await this.sendAddedEmail({
        to: email,
        name: existingUser.name || displayName,
        orgName: org.name,
        inviterName,
        role,
      });
      return { status: 'added' as const, member, emailDelivered };
    }

    if (this.mail.isConfigured()) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      await this.prisma.organizationInvite.deleteMany({
        where: { organizationId: orgId, email },
      });
      const invite = await this.prisma.organizationInvite.create({
        data: {
          organizationId: orgId,
          email,
          name: displayName ?? null,
          role,
          tokenHash,
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
          invitedById: actorId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          expiresAt: true,
          createdAt: true,
        },
      });
      const inviteUrl = `${this.appBaseUrl()}/invite/${rawToken}`;
      const emailDelivered = await this.sendInviteEmail({
        to: email,
        name: displayName,
        orgName: org.name,
        inviterName,
        role,
        inviteUrl,
      });
      return { status: 'invited' as const, invite, inviteUrl, emailDelivered };
    }

    const temporaryPassword = randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const member = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: displayName || email.split('@')[0],
          passwordHash,
        },
      });
      return tx.organizationMember.create({
        data: {
          organizationId: orgId,
          userId: user.id,
          role,
          invitedAt: new Date(),
          joinedAt: new Date(),
        },
        include: MEMBER_INCLUDE,
      });
    });

    return { status: 'created' as const, member, temporaryPassword };
  }

  async updateRole(actorId: string, orgId: string, memberId: string, dto: UpdateMemberRoleDto) {
    const actor = await this.requireManager(orgId, actorId);
    const role = dto.role as MemberRole;
    if (!INVITABLE_ROLES.has(role) || role === MemberRole.OWNER) {
      throw new BadRequestException('Cannot assign that role');
    }

    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.userId === actorId) {
      throw new ForbiddenException('You cannot change your own role');
    }
    if (member.role === MemberRole.OWNER) {
      throw new ForbiddenException('The owner role cannot be changed');
    }
    if (actor.role !== MemberRole.OWNER && member.role === MemberRole.ADMIN) {
      throw new ForbiddenException('Only owners can change admin roles');
    }
    if (role === MemberRole.ADMIN && actor.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Only owners can promote admins');
    }

    return this.prisma.organizationMember.update({
      where: { id: member.id },
      data: { role },
      include: MEMBER_INCLUDE,
    });
  }

  async remove(actorId: string, orgId: string, memberId: string) {
    const actor = await this.requireManager(orgId, actorId);
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.userId === actorId) {
      throw new ForbiddenException('You cannot remove yourself');
    }
    if (member.role === MemberRole.OWNER) {
      const ownerCount = await this.prisma.organizationMember.count({
        where: { organizationId: orgId, role: MemberRole.OWNER },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot remove the last owner');
      }
    }
    if (actor.role !== MemberRole.OWNER && member.role === MemberRole.ADMIN) {
      throw new ForbiddenException('Only owners can remove admins');
    }
    if (member.role === MemberRole.OWNER && actor.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Only owners can remove an owner');
    }

    await this.prisma.organizationMember.delete({ where: { id: member.id } });
    return { ok: true };
  }

  async cancelInvite(actorId: string, orgId: string, inviteId: string) {
    await this.requireManager(orgId, actorId);
    const invite = await this.prisma.organizationInvite.findFirst({
      where: { id: inviteId, organizationId: orgId },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    await this.prisma.organizationInvite.delete({ where: { id: invite.id } });
    return { ok: true };
  }

  async preview(rawToken: string) {
    const invite = await this.findInviteByRawToken(rawToken);
    return {
      organizationId: invite.organization.id,
      organizationName: invite.organization.name,
      email: invite.email,
      name: invite.name,
      role: invite.role,
      expiresAt: invite.expiresAt,
      inviterName: invite.invitedBy.name || invite.invitedBy.email,
    };
  }

  async accept(userId: string, rawToken: string) {
    const invite = await this.findInviteByRawToken(rawToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (normalizeEmail(user.email) !== normalizeEmail(invite.email)) {
      throw new ForbiddenException(
        `This invite was sent to ${invite.email}. Sign in with that email to join.`,
      );
    }

    const existing = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: invite.organizationId, userId },
      },
    });
    if (!existing) {
      await this.prisma.organizationMember.create({
        data: {
          organizationId: invite.organizationId,
          userId,
          role: invite.role,
          invitedAt: invite.createdAt,
          joinedAt: new Date(),
        },
      });
    }

    if (invite.name && !user.name) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { name: invite.name },
      });
    }

    await this.prisma.organizationInvite.delete({ where: { id: invite.id } });

    return {
      organizationId: invite.organization.id,
      organizationName: invite.organization.name,
      role: invite.role,
    };
  }

  private async sendInviteEmail(input: {
    to: string;
    name?: string;
    orgName: string;
    inviterName: string;
    role: MemberRole;
    inviteUrl: string;
  }) {
    const greeting = input.name?.trim() || 'there';
    const role = roleLabel(input.role);
    try {
      const result = await this.mail.send({
        to: input.to,
        subject: `Join ${input.orgName} on SoloFlow`,
        text: `Hi ${greeting},\n\n${input.inviterName} invited you to join ${input.orgName} on SoloFlow as ${role}.\n\nCreate your account and join:\n${input.inviteUrl}\n\nSign in at soloflow.practicalthings.store with your own email and password. This link expires in 14 days.`,
        html: `
          <p>Hi ${greeting},</p>
          <p><strong>${input.inviterName}</strong> invited you to join <strong>${input.orgName}</strong> on SoloFlow as <strong>${role}</strong>.</p>
          <p><a href="${input.inviteUrl}" style="display:inline-block;background:#DC2626;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Accept invite</a></p>
          <p style="color:#64748b;font-size:13px">Or copy this link:<br/>${input.inviteUrl}</p>
          <p>Each person signs in at <strong>soloflow.practicalthings.store</strong> with their own email and password. You can work at the same time from different computers.</p>
          <p style="color:#64748b;font-size:13px">This link expires in 14 days.</p>
        `,
      });
      return result.delivered;
    } catch (error) {
      this.logger.error(
        `Invite email failed for ${input.to}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  private async sendAddedEmail(input: {
    to: string;
    name?: string | null;
    orgName: string;
    inviterName: string;
    role: MemberRole;
  }) {
    const greeting = input.name?.trim() || 'there';
    const role = roleLabel(input.role);
    const loginUrl = `${this.appBaseUrl()}/login`;
    try {
      const result = await this.mail.send({
        to: input.to,
        subject: `You were added to ${input.orgName} on SoloFlow`,
        text: `Hi ${greeting},\n\n${input.inviterName} added you to ${input.orgName} on SoloFlow as ${role}.\n\nSign in with your existing email and password:\n${loginUrl}`,
        html: `
          <p>Hi ${greeting},</p>
          <p><strong>${input.inviterName}</strong> added you to <strong>${input.orgName}</strong> on SoloFlow as <strong>${role}</strong>.</p>
          <p><a href="${loginUrl}" style="display:inline-block;background:#DC2626;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Sign in</a></p>
          <p>Use your existing email and password. Owner and staff can work at the same time from different computers.</p>
        `,
      });
      return result.delivered;
    } catch (error) {
      this.logger.error(
        `Added-member email failed for ${input.to}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
