import { Controller, Headers, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';

@ApiTags('maintenance')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Post('reset-data')
  @ApiOperation({
    summary: 'Delete all users and tenant data (requires MAINTENANCE_RESET_TOKEN)',
  })
  resetData(@Headers('x-reset-token') token?: string) {
    this.maintenance.assertResetToken(token);
    return this.maintenance.resetAllData();
  }
}
