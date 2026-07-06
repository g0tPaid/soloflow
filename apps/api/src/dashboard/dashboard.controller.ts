import { Controller, Get, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TENANT_HEADER } from '@flowbooks/shared';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: true })
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('metrics')
  getMetrics(@Headers(TENANT_HEADER) orgId: string) {
    return this.dashboardService.getMetrics(orgId);
  }
}
