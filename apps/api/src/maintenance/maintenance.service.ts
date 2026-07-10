import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  assertResetToken(token: string | undefined) {
    const expected = process.env.MAINTENANCE_RESET_TOKEN?.trim();
    if (!expected) {
      throw new ForbiddenException(
        'Reset is disabled. Set MAINTENANCE_RESET_TOKEN on the API service, redeploy, then retry.',
      );
    }
    if (!token || token !== expected) {
      throw new ForbiddenException('Invalid reset token.');
    }
  }

  async resetAllData() {
    await this.prisma.auditLog.updateMany({ data: { userId: null } });

    const [organizations, users] = await this.prisma.$transaction([
      this.prisma.organization.deleteMany(),
      this.prisma.user.deleteMany(),
      this.prisma.verificationToken.deleteMany(),
    ]);

    return {
      ok: true,
      deletedOrganizations: organizations.count,
      deletedUsers: users.count,
      message: 'All users and business data were deleted. Register a new account to continue.',
    };
  }
}
