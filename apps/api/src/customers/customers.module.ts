import { DropshipPortalController } from './dropship-portal.controller';
import { DropshipPortalService } from './dropship-portal.service';
import { TenantMemberGuard } from '../common/tenant-member.guard';
import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';

@Module({
  controllers: [DropshipPortalController, CustomersController],
  providers: [DropshipPortalService, TenantMemberGuard, CustomersService],
})
export class CustomersModule {}
