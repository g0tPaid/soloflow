import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/organization.dto';
import { MemberRole } from '@flowbooks/database';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

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
          settings: {
            create: {
              currency: dto.currency || 'USD',
              timezone: dto.timezone || 'UTC',
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
}
