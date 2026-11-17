import { TenantMemberGuard } from '../common/tenant-member.guard';
import { Module, forwardRef } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [forwardRef(() => InventoryModule)],
  controllers: [InvoicesController],
  providers: [TenantMemberGuard, InvoicesService],
})
export class InvoicesModule {}
