import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@flowbooks/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { MemberRole } from '@flowbooks/database';

function asJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

@Injectable()
export class OrganizationsService {  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException('Organization slug already taken');
    }

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          logo: dto.logo ?? null,
          settings: {
            create: {
              currency: dto.currency || 'INR',
              timezone: dto.timezone || 'UTC',
              branding: asJsonValue(dto.branding),
            },
          },
          members: {
            create: {
              userId,
              role: MemberRole.OWNER,
              joinedAt: new Date(),
            },
          },
        },
        include: { settings: true },
      });
      return org;
    });
  }

  async findByUser(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: { include: { settings: true } },
      },
    });
    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));
  }

  async findOne(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { settings: true, members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(userId: string, orgId: string, dto: UpdateOrganizationDto) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!membership) throw new ForbiddenException('Not a member of this organization');
    if (membership.role !== MemberRole.OWNER && membership.role !== MemberRole.ADMIN) {
      throw new ForbiddenException('Only owners and admins can update organization settings');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { settings: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const currentBranding =
      org.settings?.branding && typeof org.settings.branding === 'object'
        ? (org.settings.branding as Record<string, unknown>)
        : {};

    const nextBranding = dto.branding
      ? { ...currentBranding, ...dto.branding }
      : undefined;

    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.logo !== undefined && { logo: dto.logo }),
        ...(nextBranding && org.settings
          ? {
              settings: {
                update: { branding: asJsonValue(nextBranding) },
              },
            }
          : nextBranding
            ? {
                settings: {
                  create: { branding: asJsonValue(nextBranding) },
                },
              }
            : {}),
      },
      include: { settings: true },
    });
  }
}
