import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { TenantRequest } from '../middleware/tenant.middleware';

export const OrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    return request.organizationId || '';
  },
);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<TenantRequest & { user?: { sub: string } }>();
    return request.user?.sub || request.userId || '';
  },
);

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
