import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { TENANT_HEADER } from '@flowbooks/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: { sub: string };
    }>();
    const organizationId = request.headers[TENANT_HEADER];
    const userId = request.user?.sub;
    if (typeof organizationId !== 'string' || !organizationId || !userId) {
      throw new ForbiddenException('Organization access required');
    }
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { userId: true },
    });
    if (!member) throw new ForbiddenException('Organization access required');
    return true;
  }
}

