import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { TENANT_HEADER } from '@flowbooks/shared';

export interface TenantRequest extends Request {
  organizationId?: string;
  userId?: string;
  memberRole?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    const orgId = req.headers[TENANT_HEADER] as string;
    const userId = (req as TenantRequest & { user?: { sub: string } }).user?.sub;

    if (!orgId) {
      return next();
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: userId || '',
        },
      },
    });

    if (!membership && userId) {
      throw new ForbiddenException('Not a member of this organization');
    }

    req.organizationId = orgId;
    req.userId = userId;
    req.memberRole = membership?.role;

    next();
  }
}
