import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService, SuperAdminGuard } from './admin.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, SuperAdminGuard],
})
export class AdminModule {}
